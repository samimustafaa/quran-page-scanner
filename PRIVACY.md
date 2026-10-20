# Mus’haf Scan — privacy information

The app does not require an account. Bookmarks, recent page numbers and reading size are stored locally using the operating system's app storage. Uninstalling the app normally removes these local preferences, subject to operating-system backup behavior.

A selected/captured photo is previewed before scanning. Continuing sends it to the configured Mus’haf Scan API, which strips metadata and forwards the image to Google Cloud Vision to extract Arabic text. The service compares that text with a fixed Quran corpus. The app server code does not store the photo, OCR text or a personal reading profile. Google processes requests under its applicable Cloud terms. The chosen hosting provider may process network identifiers and infrastructure logs; review provider configuration before publishing this notice as a final policy.

Manual page reading and saved pages do not need to send a photo. Camera and photo-library permissions can be revoked in device settings. Compatible installed builds contact Expo's update service to check for and download updates.

Before public release, the operator must add the actual support contact, API hosting provider, relevant retention details, public policy URL and applicable store privacy declarations. This document describes the included implementation and is not yet a complete published policy.
