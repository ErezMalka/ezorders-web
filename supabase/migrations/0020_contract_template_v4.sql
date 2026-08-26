-- 0020 · The terms, version 4 — a stated period, and no commitment
--
-- Version 3 removed the period along with the lock, and left 1.5 saying only
-- that the engagement is open-ended. A reader who wants to know how long the
-- agreement runs found no answer at all, which is its own kind of unclear —
-- and "no period" is not what the company means. It means twelve months, that
-- nobody is tied to them, and that either side may leave on notice.
--
--   1.5  now opens with the period — twelve months — and says in the same
--        breath that it carries no commitment. It renews for further twelve
--        month periods unless notice is given, so the document does not go
--        silent on what happens at the end. The 60 days' notice, the reason for
--        it, the written confirmation and the disconnection form are copied
--        from version 3 word for word.
--
-- Nothing else moves. 1.4 keeps its wording from version 3, and every other
-- clause is copied in place rather than retyped, so a transcription slip cannot
-- enter through this door.
--
-- Versions 1 to 3 stay exactly where they are, and a contract already signed
-- from any of them still renders the words that were signed.
--
-- is_approved is false, as it is for every new version. Somebody has to read
-- this one too.

begin;

update public.contract_templates set is_current = false where is_current;

insert into public.contract_templates (version, title, sections, notes, is_approved, is_current)
select
  4,
  t.title,
  (
    select jsonb_agg(section order by ord)
      from (
        select
          case
            when s->>'num' <> '1.0' then s
            else jsonb_set(s, '{clauses}', (
              select jsonb_agg(
                       case c->>'num'
                         when '1.5' then jsonb_build_object('num', '1.5', 'text', $t15$תקופת ההסכם היא 12 חודשים (ללא התחייבות). בתום התקופה יתחדש ההסכם מאליו לתקופות נוספות בנות 12 חודשים כל אחת, כל עוד לא נמסרה הודעת סיום כאמור להלן. כל צד רשאי לסיים את ההתקשרות בכל עת, בהודעה בכתב של 60 יום מראש, באמצעות הדואר ו/או ע״י שליחת דוא״ל לכתובת המעודכנת של החברה. ההודעה כשלעצמה מסיימת את ההתקשרות בתום 60 הימים. תקופת ההודעה נדרשת לצורך ניתוק מסודר של מערכות צד שלישי הנלוות לשירות — שרתים ואחסון, תעודות אבטחה (SSL), מערכות הגנה ואבטחת מידע, מסופי סליקה ואמצעי תשלום, וממשקים לספקים חיצוניים. תוך 7 ימי עסקים מקבלת ההודעה תשלח החברה ללקוח אישור בכתב המפרט את מועד סיום ההתקשרות ואת מועד ניתוק השירותים בפועל, וכן טופס התנתקות לחתימה לצורך תיאום הניתוק בפועל. אי-החזרת טופס ההתנתקות לא תאריך את ההתקשרות ולא תדחה את מועד סיומה.$t15$)
                         else c
                       end
                       order by cord)
                from jsonb_array_elements(s->'clauses') with ordinality as clause(c, cord)
            ))
          end as section,
          ord
          from jsonb_array_elements(t.sections) with ordinality as sect(s, ord)
      ) patched
  ),
  'תקופת ההסכם 12 חודשים (ללא התחייבות), מתחדשת מאליה; סיום בהודעה של 60 יום. כל המחירים לפני מע״מ.',
  false,
  true
from public.contract_templates t
where t.version = 3
on conflict (version) do nothing;

commit;
