-- 0019 · The terms, version 3 — no term at all
--
-- Version 2 removed the lock but kept the number: twelve months, stated up
-- front, with a sentence underneath explaining that it did not mean what a
-- reader would assume it meant. That is a worse document than one that simply
-- does not state a term, because the first thing the customer sees is still a
-- commitment they have to be talked out of.
--
--   1.4  no longer names a period. It says when the engagement starts — the day
--        the kiosks are delivered or the site goes live — which is the only
--        thing that clause was ever needed for.
--
--   1.5  no longer renews "for further periods of the same length", because
--        there is no length. It is open-ended, and either side ends it with 60
--        days' notice. The reason for the notice, the written confirmation and
--        the disconnection form all survive unchanged.
--
-- Nothing else moves. The clauses are copied from version 2 in place rather
-- than retyped, so a transcription slip cannot enter through this door.
--
-- Version 2 stays exactly where it is, and the contract already signed from it
-- still renders the words that were signed. That is what versioning is for.
--
-- is_approved is false, as it is for every new version. Somebody has to read
-- this one too.

begin;

update public.contract_templates set is_current = false where is_current;

insert into public.contract_templates (version, title, sections, notes, is_approved, is_current)
select
  3,
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
                         when '1.4' then jsonb_build_object('num', '1.4', 'text', $t14$ההתקשרות מתחילה בתאריך אספקת העמדות/ הפצה לאוויר של האתר/ אפליקציית ההזמנות. **יובהר** כי מועד תחילת ההתקשרות אינו נקבע על פי תחילת השימוש של הלקוח במוצר, אלא על פי תאריך ההתקנה/ ההפצה של המוצרים בפועל.$t14$)
                         when '1.5' then jsonb_build_object('num', '1.5', 'text', $t15$ההתקשרות אינה מוגבלת בתקופה ואין בה התחייבות למספר חודשים מינימלי. כל צד רשאי לסיים אותה בכל עת, בהודעה בכתב של 60 יום מראש, באמצעות הדואר ו/או ע״י שליחת דוא״ל לכתובת המעודכנת של החברה. ההודעה כשלעצמה מסיימת את ההתקשרות בתום 60 הימים. תקופת ההודעה נדרשת לצורך ניתוק מסודר של מערכות צד שלישי הנלוות לשירות — שרתים ואחסון, תעודות אבטחה (SSL), מערכות הגנה ואבטחת מידע, מסופי סליקה ואמצעי תשלום, וממשקים לספקים חיצוניים. תוך 7 ימי עסקים מקבלת ההודעה תשלח החברה ללקוח אישור בכתב המפרט את מועד סיום ההתקשרות ואת מועד ניתוק השירותים בפועל, וכן טופס התנתקות לחתימה לצורך תיאום הניתוק בפועל. אי-החזרת טופס ההתנתקות לא תאריך את ההתקשרות ולא תדחה את מועד סיומה.$t15$)
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
  'ללא תקופה נקובה וללא התחייבות למינימום חודשים; סיום בהודעה של 60 יום. כל המחירים לפני מע״מ.',
  false,
  true
from public.contract_templates t
where t.version = 2
on conflict (version) do nothing;

commit;
