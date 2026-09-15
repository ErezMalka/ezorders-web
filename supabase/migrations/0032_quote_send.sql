-- ─── Sending a quote ──────────────────────────────────────────────────────────
--
-- A quote is born 'draft', and quote_by_token refuses to serve a draft: the
-- customer-facing page at /q/<token> answers 404 "ההצעה אינה זמינה" for one.
-- That is correct — a draft is not finished, and a link to it should not open.
--
-- The hole was that only two of the three ways to send a quote ever changed the
-- status. Mail it or WhatsApp it from the portal and markQuoteSent ran; copy
-- the link and send it yourself — which is what most agents do — and nothing
-- did. The quote stayed a draft, so the link the customer received answered 404
-- from the moment it was pasted, and the wording of that page made it look like
-- an expiry problem. It was not: valid_until is never a reason to refuse, and a
-- quote created one minute earlier behaved exactly the same as one from March.
--
-- So sending gets a function of its own, the way contracts have had one since
-- 0014, and every route that puts the link in front of a customer calls it.
--
-- Marking a quote sent is not a formality. From here the contents are frozen
-- (0022, 0024): the document at that URL is what the customer is reading, and
-- if they accept it its hash is the evidence of what they agreed to. Changing
-- the text afterwards would leave a fingerprint that disagrees with it. This is
-- why the caller says so out loud before copying, and why editing afterwards
-- means duplicating instead.

create or replace function public.quote_send(p_id uuid, p_channel text default 'link')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_q public.quotes;
begin
  select * into v_q from public.quotes where id = p_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_q.agent_id <> auth.uid() and not public.is_manager() then
    return jsonb_build_object('ok', false, 'code', 'not_yours');
  end if;

  -- Idempotent, and deliberately so: copying the link twice is a normal thing
  -- to do, and the second copy must not fail or rewind 'viewed' back to 'sent'
  -- — which would erase the fact that the customer had already opened it.
  if v_q.status <> 'draft' then
    return jsonb_build_object('ok', true, 'code', 'already_sent',
                              'token', v_q.public_token,
                              'status', v_q.status);
  end if;

  update public.quotes
     set status       = 'sent',
         sent_at      = now(),
         sent_channel = p_channel
   where id = p_id;

  insert into public.quote_events (quote_id, event_type, actor_id, channel)
  values (p_id, 'sent', auth.uid(), p_channel);

  return jsonb_build_object('ok', true, 'code', 'sent',
                            'token', v_q.public_token,
                            'status', 'sent');
end $$;

-- Same lock-down as every other function here: 0005 took EXECUTE away from the
-- implicit grant to public, and each function hands it back to exactly the role
-- that needs it. anon must never reach this one — the token in the URL is the
-- customer's capability to *read* a quote, never to send one.
revoke all on function public.quote_send(uuid, text) from public;
revoke all on function public.quote_send(uuid, text) from anon;
grant execute on function public.quote_send(uuid, text) to authenticated;

-- No backfill on purpose.
--
-- Every quote sitting in 'draft' right now falls into one of two groups, and
-- nothing in the table tells them apart: the ones whose link an agent already
-- pasted to a customer, and the ones still genuinely being written. Flipping
-- them all to 'sent' would fix the first group and freeze the second — taking
-- away the ability to edit quotes nobody has ever seen. Once this is live an
-- agent only has to press the copy button again for a quote in the first group,
-- which sends it properly and takes a couple of seconds.
