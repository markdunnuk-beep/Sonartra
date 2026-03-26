# Engineering Principles (MVP)

1. **Engine-first:** business scoring and result generation belongs in one backend engine path.
2. **Single contract:** produce one canonical result payload format only.
3. **Deterministic execution:** no random or AI-generated output text in MVP runtime.
4. **Database-first runtime:** runtime uses structured seeded database data.
5. **No runtime workbook parsing:** Excel is source-only for seed creation and verification.
6. **No runtime JSON package parsing:** packaged files are not runtime data providers.
7. **UI is a consumer:** public, user, and admin UI consume persisted state and payloads only.
8. **Clarity over abstraction:** keep implementations explicit and minimal.
