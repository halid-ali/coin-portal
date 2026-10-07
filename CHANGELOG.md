# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-10-07

### Added

- **api:** E-mail sending behind IMailSender (SMTP or pickup folder)
- **api:** E-mail verification link and endpoints
- **api:** Sharing collections needs a confirmed e-mail address
- **client:** E-mail verification notice and page; sharing waits for it
- **client:** Privacy policy covers account e-mails
- **api:** Verification e-mail with an HTML body and a button
- **api:** Unverified accounts keep one collection and a few coins
- **api:** Unverified status and coin limit in the admin panel
- **client:** Unverified status, mark and coin limit in the admin panel
- **client:** Unverified accounts see their limits
- **api:** Unverified accounts are deleted after their lifetime
- **api:** Admins delete selected users at once
- **client:** Deletion date of unverified accounts, lifetime in the panel
- **client:** Bulk deletion and e-mail filter in the admin user list
- **client:** Tidier e-mail verification notice
- **client:** Resend the verification link with a button
- **client:** Gray add buttons while the account cannot use them
- **api:** One-time verification request, manual confirmation by admins
- **client:** Verification request and manual confirmation in the panel

### Fixed

- **client:** Buttons show the pointer cursor
- **client:** Spaces around the dots in the publication notice

## [1.6.0] - 2026-10-06

### Added

- **api:** Site isolation headers; ZAP alerts fail the build unless accepted

### Fixed

- **api:** Match share links case-sensitively
- **api:** Signing out ends every session of the user
- **api:** Generic messages for malformed request bodies
- **api:** Reject control characters in user text

## [1.5.1] - 2026-10-06

### Added

- **client:** Denomination icons for coins without photos

## [1.5.0] - 2026-10-06

### Added

- **api:** Require photographed coins for public collections
- **api:** Publish endpoint and canBePublic
- **client:** General settings in the admin panel
- **client:** Public collection rule in the collection page and forms

## [1.4.0] - 2026-10-05

### Added

- **client:** Replace the logo with a simple coin and euro sign
- **api:** Word-by-word coin search and a coin summary endpoint
- **client:** New home page for visitors and signed-in users
- **client:** Languages button in the navbar on phones

## [1.3.0] - 2026-10-04

### Added

- **client:** Not found page for unknown addresses
- **client:** Splash screen until the app starts
- **client:** Page size above the admin lists

### Fixed

- **client:** Check the session before the data export download
- **client:** Screen reader names for tables, pagination and symbols
- **client:** New tab notice, tooltips and crop frame name
- **client:** Respect reduced motion
- **client:** Accessibility findings of the e2e scan

### Changed

- **api:** Project explore coins instead of loading whole owner rows
- **client:** Load owner-only collection dialogs lazily
- **client:** Wait for countries before a country-ordered coin list, lazy cover image
- **client:** Cache Intl formatters per language
- **client:** Restore the session and load the language in parallel at startup
- **client:** Shared styles for destructive buttons and checkboxes

## [1.2.0] - 2026-10-04

### Added

- Show the photo sweep's disk check in the admin overview

### Fixed

- **deps:** Update http-cache-semantics to 4.3.0
- **api:** Sweep orphaned photo folders and harden image uploads
- **client:** Never show the API's English validation messages, fix wording
- **client:** Let Escape close dialogs when idle

## [1.1.0] - 2026-10-04

### Added

- **api:** Apply pending migrations at startup when configured
- **client:** Tie form errors to fields and manage focus between pages

### Fixed

- **client:** Fix search box and paging in coin and admin lists
- **client:** Keep dialog results on Escape and warn about unsaved changes
- **client:** Map coded errors, keep settings in step and recover the antiforgery token
- **client:** Keep keyboard focus visible and in place

## [1.0.0] - 2026-10-03

### Added

- **api:** Redirect other host names to one canonical address
- Rename the site to CoinVitrine and name the operator

## [0.4.0] - 2026-10-02

### Added

- **api:** Send security headers, HSTS and no-store for API data
- **api:** Check hosting settings at startup and retry transient SQL errors
- Add the terms of use and accept them at sign-up

### Fixed

- **api:** Serve the client for profile addresses with dots
- **auth:** Report a lockout only to someone who knows the password
- **api:** Delete photo folders even while a photo is being served
- Keep the coins of a hidden collection in it until the lock is lifted
- Require an explicit choice before deleting a collection's coins
- **api:** Bound image decoding, account size and write rates
- **client:** Say what the admin collection counts cover
- **client:** Show the licenses link only where the file exists

## [0.3.0] - 2026-10-01

### Added

- **api:** Serve the client, log to files, persist keys and rate limit requests
- **auth:** Keep sign-ins by default and after sign-up
- **client:** Make the app installable with a manifest and logo icons
- Let users export and delete their account, and admins delete users
- Add the privacy policy and contact pages, and require reading the policy at sign-up

### Fixed

- **client:** Accept large phone photos and explain unsupported HEIC

## [0.2.0] - 2026-10-01

### Added

- **api:** Grant the Admin role from configuration
- **api:** Add site statistics for admins
- **client:** Expose the user's roles
- **api:** Record sign-in and last-seen times
- **client:** Show the previous sign-in in the profile
- **api:** Add the moderation fields and the audit log
- **api:** Hide shared content of locked users and moderated collections
- **api:** Add admin endpoints for users, collections and the audit log
- **client:** Mirror the moderation lock of collections
- **api:** Mark admin-owned collections in the admin list
- **client:** Show moderation locks to owners and on sign-in
- **client:** Add the admin panel

## [0.1.0] - 2026-09-29

### Added

- **auth:** Add EF Core with SQL Server LocalDB and Identity user model
- **auth:** Add register, login, logout and me endpoints with 18+ age validation
- **api:** Add antiforgery token endpoint and global validation
- **client:** Add auth service, guards, interceptor and validators
- **client:** Add login, register and collection pages
- **client:** Add header and routes, remove temporary API status check
- **api:** Serialize enums as strings
- **api:** Add Coin and Country entities with seed data and migration
- **api:** Add countries reference endpoint
- **api:** Add coins CRUD endpoints with filtering, sorting and paging
- **api:** Allow listing all coins with pageSize=0 and default to 10 per page
- **client:** Add coin and country services with shared form error handling
- **client:** Add pagination, modal confirm dialog and custom select styling
- **client:** Show collection with filters, sorting and paging
- **client:** Add coin create and edit form
- **api:** Sort coins by any column with direction and client-provided country order
- **client:** Add sortable table headers and fixed column widths
- **api:** Store coin photos with processing, storage and quota
- **client:** Upload, crop and view coin photos
- **client:** Add grid view and center pagination on the collection page
- **client:** Open the viewer from grid tiles and edit via a pencil button
- **client:** Pan the zoomed photo in the crop dialog
- **api:** Support multiple collections per user, with covers
- **client:** Redesign the header as a navbar
- **client:** Add collections, collection selection and covers
- **api:** Share collections by link or publicly, with a read-only public API
- **client:** Share collections and browse public ones
- **api:** Store the user's UI language and add a settings endpoint
- **client:** Translate the UI into English, German and Bulgarian and add a settings page
- **api:** Store the user's color theme preference
- **client:** Add light/dark theme and a profile settings section
- **api:** Store the user's accent color preference
- **client:** Add accent color setting
- Limit user names to 20 characters
- **client:** Draw a coin as the placeholder for coins without photos
- **api:** Drop the automatic collection cover
- **client:** Show a default picture for collections without a cover
- **client:** Switch coin sides with the mouse wheel in the photo viewer
- **api:** Sort coins only by title, denomination, country and year
- **client:** Fold the coin filters on phones and simplify sorting
- **client:** Divide navigation from account items in the mobile menu
- **client:** Show the collection owner actions as icons on phones
- **client:** Keep the pagination bars to one row on phones
- **client:** Tighten the coin table columns and drop quantity
- Report the release version in the health endpoint and footer

### Fixed

- **client:** Return from the coin form to the same collection view
- **client:** Reserve scrollbar space to stop layout shift
- **client:** Keep the header on one line at narrow widths

### Changed

- **client:** Share dialog panel styles

<!-- generated by git-cliff -->
