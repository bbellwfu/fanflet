# Modal and Form Design Patterns

This document defines consistent patterns for modal dialogs and forms across the platform (admin and web apps). Colors and copy can vary by use case; **spacing and structure** should stay consistent so focus states and labels never overlap and hierarchy is clear.

## Reference Implementation

**Good example:** Admin Impersonate modal ([apps/admin/app/(dashboard)/accounts/[id]/impersonate-button.tsx](apps/admin/app/(dashboard)/accounts/[id]/impersonate-button.tsx)).

## Modal Structure

- **DialogContent:** Use `className="sm:max-w-md"` (or similar) for form modals so width is consistent.
- **DialogHeader:** Title + optional icon, then `DialogDescription` for context.
- **Body:** One wrapper div with consistent vertical spacing (see below).
- **DialogFooter:** Cancel (secondary) + primary action, with consistent padding.

## Form Spacing (Critical)

Focus rings (e.g. `ring-2`, `ring-[3px]`) extend **outside** the input. If the next form group’s label sits too close, the ring can visually overlap the label.

### Rules

1. **Label-to-control gap**  
   Use a clear gap between each label and its input/select/textarea so the control is clearly associated with the label.  
   - **Pattern:** Label with `block mb-1.5` (6px) so the input sits below with consistent spacing.  
   - Example (admin): `className="text-[13px] font-medium text-fg-muted block mb-1.5"`.

2. **Gap between form groups**  
   Use enough vertical space between one form group (label + control) and the next so the **focus ring does not overlap the next label**.  
   - **Pattern:** `space-y-5` or `space-y-6` (20px–24px) on the form body. Avoid `space-y-4` (16px) when inputs use `ring-2`/`ring-offset-2` or `ring-[3px]`, or the ring will feel like it’s touching or overlapping the next label.  
   - Admin impersonate uses `space-y-4` with only two groups; longer forms (e.g. campaign edit) need `space-y-5` or `space-y-6`.

3. **Form body padding**  
   Use `py-2` or `py-4` on the form wrapper so the first and last groups have breathing room from header and footer. Prefer the same value across similar modals.

4. **Subtext under a label**  
   If you have helper text under a label (e.g. “Select connected speakers…”), use `mb-1.5` or `mb-2` under the subtext so the control below doesn’t feel cramped.

## Focus and Input Styling

- **Inputs:** Use `focus-visible:ring-*` and, if needed, `ring-offset-2` so the ring is visible but doesn’t bleed into the next group when spacing is applied as above.
- **Textareas:** Same idea; ensure `focus-visible:ring-*` and optional `ring-offset-2` are consistent with inputs so focus never overlaps the next label.

## Checklist for New Modals

- [ ] Form body uses `space-y-5` or `space-y-6` (not only `space-y-4` if the form has several groups).
- [ ] Each label has `block mb-1.5` (or equivalent) so the control sits clearly below the label.
- [ ] Dialog header and footer have consistent padding; body has `py-2` or `py-4`.
- [ ] Focus styles use ring + optional offset; no overlap with the next label.

## Cross-App Consistency

- **Admin** and **web** may use different UI packages (`@fanflet/ui` vs `@/components/ui`); apply the same **spacing rules** (label margin, form group spacing, body padding) in both so modals feel consistent and accessible.
