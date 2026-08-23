import { describe, expect, it } from 'vitest';

import { codigosForSending, openSendingsForClient } from '../lib/linking';

/** Rows carry more than the linking functions look at; they must pass through. */
function sending(id: number, clientId: number) {
  return { id, client_id: clientId, amount_eur: id * 10 };
}

function codigo(id: number, clientId: number) {
  return { id, client_id: clientId, code: `C${id}` };
}

/* --------------------------------- what the /codigos picker offers */

describe('openSendingsForClient', () => {
  const sendings = [sending(1, 7), sending(2, 9), sending(3, 7), sending(4, 12)];

  it('keeps only that client, in the order they came in', () => {
    expect(openSendingsForClient(sendings, 7)).toEqual([sending(1, 7), sending(3, 7)]);
  });

  it('offers nothing until a client is picked', () => {
    expect(openSendingsForClient(sendings, null)).toEqual([]);
  });

  it('offers nothing for a client with no open sendings', () => {
    expect(openSendingsForClient(sendings, 99)).toEqual([]);
  });

  it('hands back the whole row, not just the fields it matched on', () => {
    const [first] = openSendingsForClient(sendings, 9);
    expect(first.amount_eur).toBe(20);
  });

  it('leaves the list it was given alone', () => {
    const original = [...sendings];
    openSendingsForClient(sendings, 7);
    expect(sendings).toEqual(original);
  });
});

/* ----------------------------------- what the /envios picker offers */

describe('codigosForSending', () => {
  const codigos = [codigo(1, 9), codigo(2, 7), codigo(3, 9), codigo(4, 7), codigo(5, 3)];

  it("puts this client's codigos first and keeps the rest", () => {
    expect(codigosForSending(codigos, 7)).toEqual([
      codigo(2, 7),
      codigo(4, 7),
      codigo(1, 9),
      codigo(3, 9),
      codigo(5, 3),
    ]);
  });

  it('preserves the incoming order inside each group', () => {
    // Newest first is how the lists are read, and moving a group to the top
    // must not reshuffle what is inside it.
    expect(codigosForSending(codigos, 9).map((c) => c.id)).toEqual([1, 3, 2, 4, 5]);
  });

  it('drops nobody: a client with no codigos still sees every other one', () => {
    expect(codigosForSending(codigos, 99).map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('changes nothing when every codigo is already this client’s', () => {
    const mine = [codigo(1, 7), codigo(2, 7)];
    expect(codigosForSending(mine, 7)).toEqual(mine);
  });

  it('has nothing to offer from an empty list', () => {
    expect(codigosForSending([], 7)).toEqual([]);
  });

  it('leaves the list it was given alone', () => {
    const original = [...codigos];
    codigosForSending(codigos, 7);
    expect(codigos).toEqual(original);
  });
});
