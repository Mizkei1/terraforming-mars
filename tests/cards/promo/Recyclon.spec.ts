import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {Recyclon} from '../../../src/server/cards/promo/Recyclon';
import {runAllActions} from '../../TestingUtils';

describe('Recyclon', () => {
  it('Should play', () => {
    const card = new Recyclon();
    const [game, player] = testGame(1);
    player.playCorporationCard(card);
    runAllActions(game);

    expect(player.production.steel).to.eq(1);
    expect(card.resourceCount).to.eq(1);
  });
});
