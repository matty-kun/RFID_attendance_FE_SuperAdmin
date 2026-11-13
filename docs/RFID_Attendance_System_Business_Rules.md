# RFID Attendance System Business Rules

**Backend Validation Rules - Engineering Translation**

> **Purpose:** Translate each Product-owned Business Rule into a concrete, implementation-oriented backend validation rule. The Product wording is preserved; implementation details are defined only as validation, authorization, API error handling, and database protection.

> **Engineering principle:** Backend Validation Rules should be implementation-oriented and testable. If a rule cannot be turned into a clear yes/no check or authorization decision, it is probably still too vague and should go back to Product for clarification.

---

## 1. Identity and RFID

### BR-01 — Each student must have a registered RFID UID before RFID attendance can be recorded.
* **Input needed:** `student_id`, `rfid_uid`, attendance/session context
* **Check:** Verify the student exists and has a non-null, registered RFID UID matching the submitted RFID identity before creating attendance.
* **If pass:** Continue to attendance validation/insert.
* **If fail:** Reject attendance request.
* **Error code:** `rfid_not_registered`
* **DB Protection:** `FK`/`NOT NULL` on student RFID relationship where applicable; registered RFID record must reference an existing student.

---

### BR-02 — Each RFID UID may belong to only one student at a time.
* **Input needed:** `rfid_uid`, `student_id`
* **Check:** Check whether the submitted RFID UID is already assigned to a different student.
* **If pass:** Allow the UID assignment if it is unassigned or already assigned to the same student.
* **If fail:** Reject the assignment if the UID belongs to another student.
* **Error code:** `rfid_uid_already_assigned`
* **DB Protection:** `UNIQUE(rfid_uid)` on the active student-RFID assignment table.

---

### BR-03 — A student must be successfully identified before attendance is recorded.
* **Input needed:** `rfid_uid` (or resolved `student_id`), attendance payload
* **Check:** Resolve the RFID UID to exactly one valid student before creating the attendance record.
* **If pass:** Continue with the resolved `student_id`.
* **If fail:** Reject attendance request.
* **Error code:** `student_not_identified`
* **DB Protection:** `FK(student_id)` to students; RFID-to-student relationship should be enforced by the database.

---

### BR-04 — An unknown or unregistered RFID must not create an attendance record.
* **Input needed:** `rfid_uid`
* **Check:** Find a registered student associated with `rfid_uid`.
* **If pass:** Continue only when a registered student is found.
* **If fail:** Reject request and do not insert attendance.
* **Error code:** `unknown_rfid`
* **DB Protection:** FK through resolved `student_id` plus `UNIQUE(rfid_uid)` on RFID assignment.

---

## 2. Events and Attendance Sessions

### BR-05 — Each Attendance Session belongs to one Event.
* **Input needed:** `session_id`, `event_id` (if supplied)
* **Check:** Load the session and verify it has exactly one valid `event_id`.
* **If pass:** Use the session's `event_id` for the session context.
* **If fail:** Reject if the session does not exist or has no valid single event association.
* **Error code:** `invalid_session_event`
* **DB Protection:** `NOT NULL session.event_id` + `FK(session.event_id) -> events.id`.

---

### BR-06 — An Event may contain multiple Attendance Sessions.
* **Input needed:** `event_id`, session data
* **Check:** Verify the event exists; do not reject creation merely because another session already exists.
* **If pass:** Allow another session for the same event.
* **If fail:** Reject only if the event does not exist or violates another constraint.
* **Error code:** `invalid_event`
* **DB Protection:** `FK(session.event_id) -> events.id`; no `UNIQUE(event_id)` constraint.

---

### BR-07 — An Attendance Session represents a specific attendance period.
* **Input needed:** `session_id`, session period/date fields
* **Check:** Verify the session has the required period identity and is uniquely identifiable.
* **If pass:** Allow attendance operations against the identified session.
* **If fail:** Reject if the session is missing required period identity.
* **Error code:** `invalid_attendance_session`
* **DB Protection:** Required fields `NOT NULL`; `UNIQUE` constraint on exact period fields.

---

### BR-08 — Each Attendance Session defines one Time-In and one Time-Out period.
* **Input needed:** `session_id`, time-in period, time-out period
* **Check:** Verify the session has exactly one configured Time-In and Time-Out period.
* **If pass:** Use the configured periods for the corresponding attendance type.
* **If fail:** Reject session configuration or operation when period is missing/invalid.
* **Error code:** `invalid_session_period`
* **DB Protection:** Required period fields `NOT NULL`; `CHECK` constraints for time ordering.

---

## 3. Attendance

### BR-09 — A student may have at most one Time-In record per Attendance Session.
* **Input needed:** `student_id`, `session_id`, `type`
* **Check:** Check whether an attendance record exists for `student_id` + `session_id` + `type=Time-In`.
* **If pass:** Allow insert.
* **If fail:** Reject request.
* **Error code:** `duplicate_time_in`
* **DB Protection:** `UNIQUE(student_id, session_id, type)`.

---

### BR-10 — A student may have at most one Time-Out record per Attendance Session.
* **Input needed:** `student_id`, `session_id`, `type`
* **Check:** Check whether an attendance record exists for `student_id` + `session_id` + `type=Time-Out`.
* **If pass:** Allow insert.
* **If fail:** Reject request.
* **Error code:** `duplicate_time_out`
* **DB Protection:** `UNIQUE(student_id, session_id, type)`.

---

### BR-11 — Time-In and Time-Out are separate attendance types.
* **Input needed:** `student_id`, `session_id`, `type`
* **Check:** Validate that type is exactly one supported attendance type.
* **If pass:** Continue using the supplied attendance type.
* **If fail:** Reject unsupported or missing type.
* **Error code:** `invalid_attendance_type`
* **DB Protection:** `CHECK(type IN ('time_in','time_out'))`.

---

### BR-12 — A duplicate Time-In or Time-Out must not create another record.
* **Input needed:** `student_id`, `session_id`, `type`
* **Check:** Check for an existing attendance record matching `student_id` + `session_id` + `type`.
* **If pass:** Insert one attendance record.
* **If fail:** Reject and do not create another record.
* **Error code:** `duplicate_attendance`
* **DB Protection:** `UNIQUE(student_id, session_id, type)`.

---

### BR-13 — Every successful attendance record must identify the student, Attendance Session, attendance type, location, actual recorded date/time, and recording admin/operator.
* **Input needed:** `student_id`, `session_id`, `type`, `location_id`, `recorded_at`, `recorded_by`
* **Check:** Validate all required fields are present and reference valid records.
* **If pass:** Insert the complete attendance record.
* **If fail:** Reject incomplete or invalid attendance request.
* **Error code:** `incomplete_attendance_record`
* **DB Protection:** `NOT NULL` on required columns; `FK`s for IDs.

---

## 4. Locations

### BR-14 — An Attendance Session may allow multiple locations for Time-In.
* **Input needed:** `session_id`, `location_id`, `type=time_in`
* **Check:** Check whether the location is mapped to the session for Time-In.
* **If pass:** Continue if mapping exists.
* **If fail:** Reject if the requested location is not mapped.
* **Error code:** `invalid_time_in_location`
* **DB Protection:** `UNIQUE(session_id, location_id, type)` on `session_locations`.

---

### BR-15 — An Attendance Session may allow multiple locations for Time-Out.
* **Input needed:** `session_id`, `location_id`, `type=time_out`
* **Check:** Check whether the location is mapped to the session for Time-Out.
* **If pass:** Continue if mapping exists.
* **If fail:** Reject if the requested location is not mapped.
* **Error code:** `invalid_time_out_location`
* **DB Protection:** `UNIQUE(session_id, location_id, type)` on `session_locations`.

---

### BR-16 — The allowed Time-In locations may be different from the allowed Time-Out locations.
* **Input needed:** `session_id`, `location_id`, `type`
* **Check:** Evaluate the allowed-location mapping using both `session_id` and attendance type.
* **If pass:** Allow the location when its specific session/type mapping exists.
* **If fail:** Reject only when the specific mapping does not exist.
* **Error code:** `invalid_location_for_type`
* **DB Protection:** `UNIQUE(session_id, location_id, type)` on `session_locations`.

---

### BR-17 — Attendance may only be recorded at a location allowed for the current Attendance Session and attendance type.
* **Input needed:** `session_id`, `location_id`, `type`
* **Check:** Check for an exact row in `session_locations` matching `session_id` + `location_id` + `type`.
* **If pass:** Continue to attendance insert.
* **If fail:** Reject attendance request.
* **Error code:** `invalid_location`
* **DB Protection:** FKs to sessions/locations plus `UNIQUE` on `session_locations`.

---

## 5. Administration

### BR-18 — Only authorized admins or organizers may access attendance-management functions.
* **Input needed:** authenticated user identity, role/permissions, requested function
* **Check:** Authenticate the caller and verify role is authorized.
* **If pass:** Allow API operation.
* **If fail:** Return authorization failure.
* **Error code:** `forbidden`
* **DB Protection:** Server-side authorization checks; API/RLS policies.

---

### BR-19 — Authorized admins or organizers may create and manage Events and Attendance Sessions.
* **Input needed:** authenticated user identity, role/permissions, event/session payload
* **Check:** Authenticate caller and verify admin/organizer permission.
* **If pass:** Execute requested management operation.
* **If fail:** Reject operation.
* **Error code:** `forbidden`
* **DB Protection:** RLS/API authorization policy.

---

### BR-20 — Authorized admins or organizers may open, close, and control attendance operations.
* **Input needed:** authenticated user identity, role/permissions, session/event status
* **Check:** Authenticate caller and verify permission before changing state.
* **If pass:** Apply the requested state change.
* **If fail:** Reject operation.
* **Error code:** `forbidden`
* **DB Protection:** RLS/API authorization policy on state-changing operations.

---

### BR-21 — Authorized admins may search and review student attendance records.
* **Input needed:** authenticated user identity, role/permissions, search/filter inputs
* **Check:** Authenticate caller and verify admin authorization.
* **If pass:** Return records permitted by the admin scope.
* **If fail:** Reject access.
* **Error code:** `forbidden`
* **DB Protection:** RLS/API `SELECT` policy restricted to admins.

---

### BR-22 — Attendance corrections or scan discrepancies may only be handled by authorized admins.
* **Input needed:** authenticated user identity, role, record id, correction payload
* **Check:** Authenticate caller and verify admin authorization before modifying.
* **If pass:** Apply correction and record the operator identity.
* **If fail:** Reject correction.
* **Error code:** `forbidden`
* **DB Protection:** RLS/API `UPDATE` policy restricted to admins.

---

## 6. Student Experience

### BR-23 — Students use their assigned RFID to identify themselves for attendance.
* **Input needed:** `rfid_uid`
* **Check:** Resolve the submitted RFID UID to the assigned student.
* **If pass:** Use the resolved student identity.
* **If fail:** Reject if the RFID is not assigned.
* **Error code:** `unknown_rfid`
* **DB Protection:** `UNIQUE(rfid_uid)` on RFID assignment and FK to student.

---

### BR-24 — Students must receive clear feedback after a scan, such as accepted, rejected, duplicate, or invalid.
* **Input needed:** validated scan request and validation result
* **Check:** Map the backend outcome to a stable API result/status code.
* **If pass:** Return success status and attendance result.
* **If fail:** Return a deterministic failure status and error code.
* **Error code:** `varies_by_validation_result`
* **DB Protection:** API response contract must expose stable machine-readable codes.

---

### BR-25 — Students may view their attendance history and current attendance status where that feature is enabled.
* **Input needed:** authenticated student identity, requested scope, feature status
* **Check:** Authenticate and verify feature is enabled; restrict to own records.
* **If pass:** Return permitted attendance history/status.
* **If fail:** Reject access if unauthenticated or disabled.
* **Error code:** `forbidden_or_feature_disabled`
* **DB Protection:** RLS/API `SELECT` policy restricting students to their own records.

---

## Backend Validation Rules — Summary

| Business Rule | Backend Check | Pass | Fail | Error | DB Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **One Time-In per session** | Check `student_id` + `session_id` + `type` | Insert | Reject | `duplicate_time_in` | Composite `UNIQUE` |
| **One Time-Out per session** | Check `student_id` + `session_id` + `type` | Insert | Reject | `duplicate_time_out` | Composite `UNIQUE` |
| **RFID must be registered** | Find student by `rfid_uid` | Continue | Reject | `unknown_rfid` | `UNIQUE(rfid_uid)` |
| **Student must be identified** | Resolve RFID to one student | Continue | Reject | `student_not_identified` | `FK(student_id)` |
| **Location must be allowed** | Check `session_locations` | Continue | Reject | `invalid_location` | Composite `UNIQUE` |
| **Record must be complete** | Validate required IDs/time | Insert | Reject | `incomplete_attendance_record` | `NOT NULL` + FKs |
| **Attendance type is valid** | Check type is Time-In or Time-Out | Continue | Reject | `invalid_attendance_type` | `CHECK`/enum |
| **Management is authorized** | Authenticate + role check | Allow | Reject | `forbidden` | RLS/API policy |

---

> [!NOTE]
> **Scope note:** The source document explicitly states that SQL constraints, endpoint design, framework choice, deployment, logging infrastructure, and database connection setup are Engineering concerns. This document therefore translates the rules into backend validation targets without changing the Product-owned rules.
