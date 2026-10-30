-- Geri alma: hesap RPC'leri
-- Fonksiyonlar silinir; tablolardaki veriye dokunulmaz.

begin;

drop function public.update_account(text, text, text, text);
drop function public.complete_signup(text, text, text, jsonb, jsonb);
drop function public.username_available(text);
drop function public.v2_text_answer(jsonb, text[], integer);
drop function public.v2_text_array(jsonb, text[]);
drop function public.v2_username_ok(text);

commit;
