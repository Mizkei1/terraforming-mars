import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {Tardigrades} from '../../../src/server/cards/base/Tardigrades';
import {TestPlayer} from '../../TestPlayer';

describe('Tardigrades', () => {
  let card: Tardigrades;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Tardigrades();
    [/* game */, player] = testGame(1);
  });

  it('Should play', () => {
    player.playedCards.push(card);
    card.play(player);
    player.addResourceTo(card, 7);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('Should act', () => {
    player.playedCards.push(card);
    card.action(player);
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(1);
  });
});
