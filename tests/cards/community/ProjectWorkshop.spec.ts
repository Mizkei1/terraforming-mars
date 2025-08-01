import {expect} from 'chai';
import {AdvancedAlloys} from '../../../src/server/cards/base/AdvancedAlloys';
import {SmallAnimals} from '../../../src/server/cards/base/SmallAnimals';
import {CardType} from '../../../src/common/cards/CardType';
import {ProjectWorkshop} from '../../../src/server/cards/community/ProjectWorkshop';
import {ICard} from '../../../src/server/cards/ICard';
import {Extremophiles} from '../../../src/server/cards/venusNext/Extremophiles';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {TestPlayer} from '../../TestPlayer';
import {AncientShipyards} from '../../../src/server/cards/moon/AncientShipyards';
import {cast, churn, runAllActions} from '../../TestingUtils';
import {Phase} from '../../../src/common/Phase';
import {Reds} from '../../../src/server/turmoil/parties/Reds';
import {PoliticalAgendas} from '../../../src/server/turmoil/PoliticalAgendas';
import {testGame} from '../../TestGame';
import {Birds} from '../../../src/server/cards/base/Birds';
import {Helion} from '../../../src/server/cards/corporation/Helion';
import {SelectPayment} from '../../../src/server/inputs/SelectPayment';
import {Payment} from '../../../src/common/inputs/Payment';
import {WaterImportFromEuropa} from '../../../src/server/cards/base/WaterImportFromEuropa';
import {JovianEmbassy} from '../../../src/server/cards/promo/JovianEmbassy';
import {ResearchCoordination} from '../../../src/server/cards/prelude/ResearchCoordination';

describe('ProjectWorkshop', () => {
  let card: ProjectWorkshop;
  let player: TestPlayer;
  let game: IGame;
  let advancedAlloys: AdvancedAlloys;
  let birds: Birds;

  beforeEach(() => {
    card = new ProjectWorkshop();
    advancedAlloys = new AdvancedAlloys();
    birds = new Birds();
    [game, player] = testGame(1);

    card.play(player);
    player.corporations.push(card);
  });

  it('Starts with correct resources', () => {
    expect(player.steel).to.eq(1);
    expect(player.titanium).to.eq(1);

    player.defer(card.initialAction(player));
    runAllActions(game);
    expect(player.cardsInHand).has.lengthOf(1);
    expect(player.cardsInHand[0].type).to.eq(CardType.ACTIVE);
  });

  it('Can not act', () => {
    player.megaCredits = 2;
    expect(card.canAct(player)).is.not.true;
  });

  it('Can spend 3 M€ to draw a blue card', () => {
    player.megaCredits = 3;

    expect(card.canAct(player)).is.true;
    const selectOption = cast(churn(card.action(player), player), SelectOption);
    expect(churn(() => selectOption.cb(undefined), player)).is.undefined;
    expect(player.cardsInHand).has.lengthOf(1);
    expect(player.cardsInHand[0].type).to.eq(CardType.ACTIVE);
  });

  it('Can flip a played blue card and remove its ongoing effects', () => {
    player.playedCards.push(advancedAlloys);
    advancedAlloys.play(player);
    player.megaCredits = 0;

    expect(player.getSteelValue()).to.eq(3);
    expect(player.getTitaniumValue()).to.eq(4);

    card.action(player).cb(undefined);
    expect(player.playedCards.asArray()).deep.eq([card]);
    expect(game.projectDeck.discardPile.includes(advancedAlloys)).is.true;
    expect(player.cardsInHand).has.lengthOf(2);
    expect(player.getSteelValue()).to.eq(2);
    expect(player.getTitaniumValue()).to.eq(3);
  });

  it('Can flip a played blue card and remove its resources', () => {
    player.playedCards.push(birds);
    birds.resourceCount = 4;

    card.action(player).cb(undefined);

    expect(player.playedCards.asArray()).deep.eq([card]);
    expect(game.projectDeck.discardPile.includes(birds)).is.true;
    expect(birds.resourceCount).eq(0);
  });

  it('Converts VP to TR correctly', () => {
    const smallAnimals = new SmallAnimals();
    player.addResourceTo(smallAnimals, 5);

    const extremophiles = new Extremophiles();
    player.addResourceTo(extremophiles, 11);

    const originalTR = player.terraformRating;
    player.playedCards.push(smallAnimals, extremophiles);

    const selectOption = cast(card.action(player), SelectOption);
    const selectCard = cast(selectOption.cb(undefined), SelectCard<ICard>);

    selectCard.cb([smallAnimals]);
    expect(player.terraformRating).to.eq(originalTR + 2);
    expect(player.cardsInHand).has.lengthOf(2);

    selectCard.cb([extremophiles]);
    expect(player.terraformRating).to.eq(originalTR + 5);
    expect(player.cardsInHand).has.lengthOf(4);
  });

  it('Converts VP to TR correctly when counting tags', () => {
    const waterImportFromEuropa = new WaterImportFromEuropa();
    const originalTR = player.terraformRating;

    player.playedCards.push(waterImportFromEuropa);
    player.actionsThisGeneration.add(waterImportFromEuropa.name);
    player.playedCards.push(new JovianEmbassy());

    const selectOption = cast(card.action(player), SelectOption);
    cast(selectOption.cb(undefined), undefined);

    expect(player.terraformRating).to.eq(originalTR + 2);
    expect(player.playedCards).does.not.include(waterImportFromEuropa);
  });


  it('Converts VP to TR correctly when counting wild tags', () => {
    const waterImportFromEuropa = new WaterImportFromEuropa();
    const originalTR = player.terraformRating;

    player.playedCards.push(waterImportFromEuropa);
    player.actionsThisGeneration.add(waterImportFromEuropa.name);
    player.playedCards.push(new JovianEmbassy());
    player.playedCards.push(new ResearchCoordination());

    const selectOption = cast(card.action(player), SelectOption);
    cast(selectOption.cb(undefined), undefined);

    expect(player.terraformRating).to.eq(originalTR + 3);
    expect(player.playedCards).does.not.include(waterImportFromEuropa);
  });

  it('Can select option if able to do both actions', () => {
    player.playedCards.push(advancedAlloys);
    player.megaCredits = 3;
    // That the response is OrOptions is the test.
    cast(card.action(player), OrOptions);
  });

  it('Project Workshop removes TR when flipping Ancient Shipyards', () => {
    const ancientShipyards = new AncientShipyards();
    player.addResourceTo(ancientShipyards, 5);

    const originalTR = player.terraformRating;
    player.playedCards.push(ancientShipyards);

    const selectOption = cast(card.action(player), SelectOption);

    expect(selectOption.cb(undefined)).is.undefined;
    expect(player.playedCards.asArray()).deep.eq([card]);

    expect(player.terraformRating).to.eq(originalTR - 5);
    expect(player.cardsInHand).has.lengthOf(2);
  });


  it('Project Workshop and Reds taxes', () => {
    [game, player] = testGame(1, {turmoilExtension: true});
    card.play(player);
    player.corporations.push(card);
    player.game.phase = Phase.ACTION;

    const turmoil = game.turmoil!;
    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);

    const smallAnimals = new SmallAnimals();
    player.addResourceTo(smallAnimals, 4);
    expect(smallAnimals.getVictoryPoints(player)).eq(2);

    const extremophiles = new Extremophiles();
    player.addResourceTo(extremophiles, 9);
    expect(extremophiles.getVictoryPoints(player)).eq(3);

    birds.resourceCount = 1;
    expect(birds.getVictoryPoints(player)).eq(1);

    player.playedCards.push(smallAnimals, extremophiles, birds);

    const selectCard = () => {
      const orOptions = cast(card.action(player), OrOptions);
      return cast(orOptions.options[1].cb(), SelectCard);
    };

    player.megaCredits = 9;
    expect(selectCard().cards).has.members([smallAnimals, extremophiles, birds]);

    player.megaCredits = 8;
    expect(selectCard().cards).has.members([smallAnimals, birds]);

    player.megaCredits = 6;
    expect(selectCard().cards).has.members([smallAnimals, birds]);

    const originalTR = player.terraformRating;
    player.megaCredits = 5;

    const orOptions = cast(card.action(player), OrOptions);
    expect(orOptions.options[1].cb()).is.undefined;
    runAllActions(game);

    expect(player.playedCards.asArray()).has.members([card, smallAnimals, extremophiles]);
    expect(game.projectDeck.discardPile).contains(birds);
    expect(player.terraformRating).to.eq(originalTR + 1);
    expect(player.megaCredits).eq(2); // Spent 3MC for the reds tax.
  });

  it('Project Workshop + Helion', () => {
    const helion = new Helion();
    helion.play(player);
    player.corporations.push(helion);

    player.megaCredits = 2;
    expect(card.canAct(player)).is.false;
    player.heat = 1;
    expect(card.canAct(player)).is.true;

    // Setting a larger amount of heat just to make the test results more interesting
    player.heat = 5;

    const selectOption = cast(churn(card.action(player), player), SelectOption);
    const selectPayment = cast(churn(() => selectOption.cb(undefined), player), SelectPayment);
    selectPayment.cb({...Payment.EMPTY, megaCredits: 1, heat: 2});
    expect(player.megaCredits).to.eq(1);
    expect(player.heat).to.eq(3);
    expect(player.cardsInHand).has.lengthOf(1);
    expect(player.cardsInHand[0].type).to.eq(CardType.ACTIVE);
  });
});
