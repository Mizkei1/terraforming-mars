import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {BeamFromAThoriumAsteroid} from '../../../src/server/cards/base/BeamFromAThoriumAsteroid';

describe('BeamFromAThoriumAsteroid', () => {
  let card: BeamFromAThoriumAsteroid;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BeamFromAThoriumAsteroid();
    [/* game */, player] = testGame(1);
  });

  it('Cannot play without a Jovian tag', () => {
    expect(card.canPlay(player)).is.not.true;
  });

  it('Should play', () => {
    player.playedCards.push(card);
    expect(card.canPlay(player)).is.true;

    card.play(player);
    expect(player.production.heat).to.eq(3);
    expect(player.production.energy).to.eq(3);

    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
