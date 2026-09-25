/**
 * Guest session contract.
 *
 * Shape is deliberately identical to the future `guest_sessions` table
 * (project architecture doc, section 4):
 *   guest_sessions (id, session_token, company_profile_draft jsonb,
 *                    created_at, expires_at)
 *
 * `id` is server-generated once the table exists (Stage 3) and is not part
 * of this client-side contract — `session_token` is the client-generated,
 * client-held identifier that both the pre-DB (Stage 2) and post-DB
 * (Stage 3+) worlds key off of, so nothing here needs to change shape when
 * the table is created.
 */
export interface GuestCompanyProfileDraft {
  name?: string;
  niche?: string;
  toneOfVoice?: string;
  targetAudience?: string;
  usp?: string;
  websiteUrl?: string;
}

export interface GuestSession {
  sessionToken: string;
  companyProfileDraft: GuestCompanyProfileDraft | null;
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
}
