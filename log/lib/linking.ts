/**
 * Which codigo goes with which sending: what the two link pickers offer.
 *
 * The link between a codigo and a sending can be made from either end, and the
 * two ends deliberately offer different lists, because they are asked in
 * different situations:
 *
 *   from /codigos — Jose is registering a codigo he just issued to a client, so
 *     the only sendings that can possibly be meant are that client's own. The
 *     list is FILTERED to them, and picking from another client's is not a
 *     choice the form should offer at all.
 *
 *   from /envios — Jose is settling one sending and reaching for a codigo he
 *     already issued, possibly a while ago and possibly recorded under a
 *     relative's name. So nothing is filtered out; this client's codigos are
 *     only pushed to the top, where he will normally find the right one.
 *
 * Both are pure list operations. The database narrows to what is still open
 * (a sending with no client payment, a codigo with no sending); these decide
 * only what is worth showing and in what order, and never mutate their input.
 */

/** A sending as the /codigos picker needs it. */
export interface LinkableSending {
  id: number;
  client_id: number;
}

/** A codigo as the /envios picker needs it. */
export interface LinkableCodigo {
  id: number;
  client_id: number;
}

/**
 * The open sendings belonging to one client, in the order they came in.
 * Nothing at all until a client is picked: an unscoped list here would invite
 * marking the wrong client's sending as paid.
 */
export function openSendingsForClient<T extends LinkableSending>(
  sendings: T[],
  clientId: number | null,
): T[] {
  if (clientId === null) return [];
  return sendings.filter((sending) => sending.client_id === clientId);
}

/**
 * Every unlinked codigo, this client's first.
 *
 * A stable two-group partition, not a sort: the order the rows arrived in is
 * meaningful (newest codigo first, as the list pages show them) and is kept
 * inside each group.
 */
export function codigosForSending<T extends LinkableCodigo>(
  codigos: T[],
  clientId: number,
): T[] {
  return [
    ...codigos.filter((codigo) => codigo.client_id === clientId),
    ...codigos.filter((codigo) => codigo.client_id !== clientId),
  ];
}
