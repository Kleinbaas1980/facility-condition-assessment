# Administrator access and approvals

Run `npm run db:migrate` for migration 002. New accounts are assessors. Register and verify the intended administrator, then from the trusted server terminal run:

```bash
npm run admin:promote -w server -- admin@example.com
```

There is no default admin password. The Admin login uses existing JWT HttpOnly cookies and the same password recovery. A client cannot assign itself a role. Roles are checked against PostgreSQL on each authenticated request.

Administrators see all projects and may manage facility/company logos and site plans. Assessors retain photo capture and their signature upload. Deleting or replacing platform files is admin-only. Assessors may request project/file/finding removal; the original remains until approval. The review queue supports approval, rejection, review notes and audit records. Pending requests are deduplicated. Deletions are applied transactionally; blobs are removed through the existing retryable cleanup queue.

Direct payload edits that omit saved areas, elements or findings are blocked for assessors. Admin approvals increment the project version, so a stale assessor window cannot restore deleted findings by saving. Reopen a project after approval.
