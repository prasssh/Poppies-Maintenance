/**
 * Shared selectors for the Ninja Forms contact form on
 * https://poppiesusadev.wpengine.com/contact-us
 *
 * The form is Ninja Forms rendered on the front end (form_id=1 in
 * wp-admin), NOT Contact Form 7 — the field markup uses
 * `#nf-field-N` / `#nf-error-N`, not CF7's `.wpcf7-*` classes. Keep the
 * IDs in one place here so a plugin update that renumbers fields only
 * needs a fix in this file.
 */
export const contactForm = {
  // Scope to the <form> that actually contains field 1, rather than
  // guessing at a wrapper class (e.g. `.nf-form-cont`) we haven't
  // confirmed against the live DOM.
  form: 'form:has(#nf-field-1)',

  name: '#nf-field-1',
  email: '#nf-field-2',
  message: '#nf-field-3',
  submit: '#nf-field-4',

  // Each field's validation message lives in the element referenced by
  // its aria-describedby (e.g. name="nf-field-1" -> aria-describedby="nf-error-1").
  errorFor: (fieldNumber) => `#nf-error-${fieldNumber}`,

  // TODO: confirm this against the live DOM (blocked by robots.txt from
  // here) — Ninja Forms commonly renders the post-submit success/error
  // message in a `.nf-response-msg` element, but versions/themes can
  // differ. Update the selector below if it doesn't match.
  responseOutput: '.nf-response-msg',
};