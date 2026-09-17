-- ─── What each payment is FOR ─────────────────────────────────────────────────
--
-- A contract can be paid in pieces: the setup on a card, the hardware by bank
-- transfer. GROW has no partial payment — no open amount, and a product price
-- is fixed — so each piece is a link of its own.
--
-- The pieces were chosen in the browser and then forgotten. The row recorded an
-- amount and nothing about what that amount covered, which broke the feature in
-- the one place it mattered: the picker offered every item as available, while
-- the server refused anything that overlapped a link already issued. An agent
-- saw three open checkboxes, ticked them, and was told the selection exceeded a
-- balance it had no way to see. There was no way to tell which item was already
-- claimed, because nothing knew.
--
-- part_keys is the answer, and it is the keys rather than the labels: a label is
-- for reading and can be edited on the quote, while the key is what a selection
-- is matched against. for_label is kept beside it for the reader — an agent
-- scanning the history wants "Panel PC", not a uuid.

alter table public.contract_payments
  add column if not exists for_label text,
  add column if not exists part_keys  text[];

comment on column public.contract_payments.part_keys is
  'Which payable parts this link covers: "base" for the setup fee, otherwise a quote_items id. Null means the whole bill.';
comment on column public.contract_payments.for_label is
  'The same parts named the way the customer reads them, as sent to GROW for the page and the invoice.';

-- Finding what is still unclaimed means asking "which parts have a live link",
-- for one contract, on every render of the payment section.
create index if not exists contract_payments_live_idx
  on public.contract_payments (contract_id)
  where status in ('pending', 'paid');
