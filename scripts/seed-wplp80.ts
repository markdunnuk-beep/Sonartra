import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';
import { loadWplp80Seeds } from '../db/seed/wplp80';

type IdRow = { id: string };

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in .env.local');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    const seeds = loadWplp80Seeds();

    await client.query('BEGIN');

    // 1) Assessment
    const assessmentResult = await client.query<IdRow>(
      `
      INSERT INTO assessments (
        assessment_key,
        title,
        description,
        is_active
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (assessment_key)
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id
      `,
      [
        seeds.assessment.key,
        seeds.assessment.title,
        seeds.assessment.description,
        true,
      ],
    );

    const assessmentId = assessmentResult.rows[0]?.id;
    if (!assessmentId) {
      throw new Error('Failed to upsert assessment');
    }

    // 2) Assessment version
    const versionResult = await client.query<IdRow>(
      `
      INSERT INTO assessment_versions (
        assessment_id,
        version,
        lifecycle_status,
        title_override,
        description_override,
        published_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (assessment_id, version)
      DO UPDATE SET
        lifecycle_status = EXCLUDED.lifecycle_status,
        title_override = EXCLUDED.title_override,
        description_override = EXCLUDED.description_override,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
      RETURNING id
      `,
      [
        assessmentId,
        seeds.assessment.version,
        'PUBLISHED',
        null,
        null,
        new Date().toISOString(),
      ],
    );

    const assessmentVersionId = versionResult.rows[0]?.id;
    if (!assessmentVersionId) {
      throw new Error('Failed to upsert assessment version');
    }

 // 3) Domains
const domainIdByKey = new Map<string, string>();

for (const domain of seeds.domains) {
  const result = await client.query<IdRow>(
    `
    INSERT INTO domains (
      assessment_version_id,
      domain_key,
      label,
      description,
      domain_type,
      order_index
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (assessment_version_id, domain_key)
    DO UPDATE SET
      label = EXCLUDED.label,
      description = EXCLUDED.description,
      domain_type = EXCLUDED.domain_type,
      order_index = EXCLUDED.order_index,
      updated_at = NOW()
    RETURNING id
    `,
    [
      assessmentVersionId,
      domain.key,
      domain.title,
      null,
      'QUESTION_SECTION',
      domain.order,
    ],
  );

  domainIdByKey.set(domain.key, result.rows[0]?.id);
}

    // 4) Signals
    const signalIdByKey = new Map<string, string>();

    for (const signal of seeds.signals) {
      const domainId = domainIdByKey.get(signal.domainKey);

      if (!domainId) {
        throw new Error(`Missing domain for signal ${signal.key} (${signal.domainKey})`);
      }

      const result = await client.query<IdRow>(
        `
        INSERT INTO signals (
          assessment_version_id,
          domain_id,
          signal_key,
          label,
          description,
          order_index,
          is_overlay
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (assessment_version_id, signal_key)
        DO UPDATE SET
          domain_id = EXCLUDED.domain_id,
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          order_index = EXCLUDED.order_index,
          is_overlay = EXCLUDED.is_overlay,
          updated_at = NOW()
        RETURNING id
        `,
        [
          assessmentVersionId,
          domainId,
          signal.key,
          signal.title,
          signal.description ?? null,
          signal.order,
          false,
        ],
      );

      signalIdByKey.set(signal.key, result.rows[0]?.id);
    }

    // 5) Questions
    const questionIdByKey = new Map<string, string>();

    for (const question of seeds.questions) {
      const domainId = domainIdByKey.get(question.domainKey);

      if (!domainId) {
        throw new Error(`Missing domain for question ${question.key} (${question.domainKey})`);
      }

      const result = await client.query<IdRow>(
        `
        INSERT INTO questions (
          assessment_version_id,
          domain_id,
          question_key,
          prompt,
          order_index
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (assessment_version_id, question_key)
        DO UPDATE SET
          domain_id = EXCLUDED.domain_id,
          prompt = EXCLUDED.prompt,
          order_index = EXCLUDED.order_index,
          updated_at = NOW()
        RETURNING id
        `,
        [
          assessmentVersionId,
          domainId,
          question.key,
          question.text,
          question.order,
        ],
      );

      questionIdByKey.set(question.key, result.rows[0]?.id);
    }

    // 6) Options
    const optionIdByKey = new Map<string, string>();

    for (const option of seeds.options) {
      const questionId = questionIdByKey.get(option.questionKey);

      if (!questionId) {
        throw new Error(`Missing question for option ${option.key} (${option.questionKey})`);
      }

      const result = await client.query<IdRow>(
        `
        INSERT INTO options (
          question_id,
          option_key,
          option_label,
          option_text,
          order_index
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (question_id, option_key)
        DO UPDATE SET
          option_label = EXCLUDED.option_label,
          option_text = EXCLUDED.option_text,
          order_index = EXCLUDED.order_index,
          updated_at = NOW()
        RETURNING id
        `,
        [questionId, option.key, option.label, option.text, option.order],
      );

      optionIdByKey.set(option.key, result.rows[0]?.id);
    }

    // 7) Option signal weights
    for (const weight of seeds.optionSignalWeights) {
      const optionId = optionIdByKey.get(weight.optionKey);
      const signalId = signalIdByKey.get(weight.signalKey);

      if (!optionId) {
        throw new Error(`Missing option for weight ${weight.optionKey}`);
      }

      if (!signalId) {
        throw new Error(`Missing signal for weight ${weight.signalKey}`);
      }

      await client.query(
        `
        INSERT INTO option_signal_weights (
          option_id,
          signal_id,
          weight,
          source_weight_key
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (option_id, signal_id)
        DO UPDATE SET
          weight = EXCLUDED.weight,
          source_weight_key = EXCLUDED.source_weight_key,
          updated_at = NOW()
        `,
        [
          optionId,
          signalId,
          weight.weight,
          weight.sourceWeightKey,
        ],
      );
    }

    await client.query('COMMIT');

    console.log('WPLP-80 seed completed successfully.');
    console.log(`Assessment ID: ${assessmentId}`);
    console.log(`Assessment Version ID: ${assessmentVersionId}`);
    console.log(`Domains: ${seeds.domains.length}`);
    console.log(`Signals: ${seeds.signals.length}`);
    console.log(`Questions: ${seeds.questions.length}`);
    console.log(`Options: ${seeds.options.length}`);
    console.log(`Option Signal Weights: ${seeds.optionSignalWeights.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('WPLP-80 seed failed.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});