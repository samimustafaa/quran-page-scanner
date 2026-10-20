# Verification — 2026-10-20

- TypeScript: passed (`npm run typecheck`).
- Android and iOS JavaScript/Hermes bundle export: passed. This is not an APK/IPA compilation or signing test.
- Web bundle export: passed.
- Python suite: 19 tests passed.
- Full-corpus round trip: all 604 pages matched their own canonical Arabic text (604/604). This measures text matching only, not camera/OCR accuracy.
- Browser at 390 × 844: manual page 604, all three final surahs, bookmark, persisted bookmark after reload, reading-size setting, and invalid-page rejection passed. No browser runtime errors.
- Live Cloud Vision request: not tested; API credential not provided. OCR HTTP integration was tested with a mocked provider response.
- Native camera/photo-library dialogs, physical-device scans, signed APK/iOS build, app-store submission and installed-build OTA delivery: require connected accounts/devices and remain unverified.
