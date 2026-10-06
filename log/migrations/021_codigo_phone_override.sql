-- A código can be withdrawn with someone else's phone.
--
-- Clients sometimes send José a código that has to be cashed out with a phone
-- number that is not the one on their ficha. phone_override is that number,
-- stored on the código itself: null means "use the client's phone", and it is
-- never written back to clients, so the client's own phone stays untouched.

alter table codigos add column if not exists phone_override text;
