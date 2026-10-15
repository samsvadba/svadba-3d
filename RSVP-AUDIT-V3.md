# V3 RSVP compatibility audit

Baseline: 671db7ff20d30ace7734ae524fe03201e8b608f7.

## Preserved receiver contract

The existing `config.wedding.rsvpEndpoint` is unchanged. Submission remains a
form-encoded POST containing one JSON field named `payload`.

| Field | Existing value / meaning |
| --- | --- |
| requestId | UUID; matched against the save acknowledgement |
| guestNames | Trimmed array of 1–12 guest names |
| attendance | `yes` or `no` |
| transport | `bus` or `direct`; empty when declining |
| lodging | `yes` or `no`; empty when declining |
| lodgingCount | 1 through guest count when requesting accommodation; otherwise 1 |
| dietary, music, message | Optional strings for attending guests; empty when declining |
| website | Empty honeypot field |

No field names, enum values, payload shape, endpoint or submission code changed.
Declining guests retain the existing attendance-and-names flow; attending
guests also answer transport, accommodation and optional details.

## Offline checks

Run `npm run test:rsvp`. Tests use an in-memory DOM fixture and fake form
submission. They cannot contact Google or add spreadsheet rows. Checks cover
1–12 names, required-field errors and focus, accommodation bounds, both bus
choices, optional messages, review-before-send, repeated-click protection,
language changes during submission, success/error/timeout handling, sender and
origin validation, cleanup, reduced motion, FAQ translations and current times.

These tests validate the frontend contract, not the live receiver or a saved
spreadsheet row. No production guest submission is used as a test.

## Existing backend follow-up

The historical local Apps Script copy maps `bus` to the outdated display text
`Autobus zo Šúroviec o 14:15`, and `direct` to `Priamo ku kostolu`. The current
deployment source has not been accessible, so this is a known risk to verify,
not a claim about its present implementation.

In the actual RSVP project, retain validation of `bus` / `direct` and update only
the stored display labels to `Autobus po obrade: Trnava → Šúrovce` and
`Vlastná doprava`. Check the existing spreadsheet column headings and any
return-bus mapping for the same obsolete route. Do not rename payload fields,
move columns, rewrite historical guest answers, change the spreadsheet target,
replace the acknowledgement logic or create a new endpoint. Redeploy the
existing deployment only after confirming the correct project and target.

The spreadsheet supplied during this task has a different ID from the
historical local script copy. Do not infer that the old copy is the live source
or repoint a receiver based on it.

The public FAQ and RSVP already describe the confirmed route: after the
15:00 ceremony in Trnava, a bus takes guests to Šúrovce. Arrival is around
14:50 directly at the church. No unconfirmed RSVP deadline is introduced.
