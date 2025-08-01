import {Units} from '../../common/Units';
import {ICard} from '../cards/ICard';
import {TRSource} from '../../common/cards/TRSource';
import {AddResourcesToCard} from '../deferredActions/AddResourcesToCard';
import {BuildColony} from '../deferredActions/BuildColony';
import {DecreaseAnyProduction} from '../deferredActions/DecreaseAnyProduction';
import {PlaceCityTile} from '../deferredActions/PlaceCityTile';
import {PlaceGreeneryTile} from '../deferredActions/PlaceGreeneryTile';
import {PlaceOceanTile} from '../deferredActions/PlaceOceanTile';
import {RemoveAnyPlants} from '../deferredActions/RemoveAnyPlants';
import {MoonExpansion} from '../moon/MoonExpansion';
import {PlaceMoonHabitatTile} from '../moon/PlaceMoonHabitatTile';
import {PlaceMoonMineTile} from '../moon/PlaceMoonMineTile';
import {PlaceMoonRoadTile} from '../moon/PlaceMoonRoadTile';
import {PlaceSpecialMoonTile} from '../moon/PlaceSpecialMoonTile';
import {CanAffordOptions, IPlayer} from '../IPlayer';
import {Behavior} from './Behavior';
import {Counter, ICounter} from './Counter';
import {Turmoil} from '../turmoil/Turmoil';
import {SendDelegateToArea} from '../deferredActions/SendDelegateToArea';
import {BehaviorExecutor} from './BehaviorExecutor';
import {PlaceTile} from '../deferredActions/PlaceTile';
import {Resource} from '../../common/Resource';
import {SelectPaymentDeferred} from '../deferredActions/SelectPaymentDeferred';
import {OrOptions} from '../inputs/OrOptions';
import {SelectOption} from '../inputs/SelectOption';
import {Payment} from '../../common/inputs/Payment';
import {SelectResources} from '../inputs/SelectResources';
import {TITLES} from '../inputs/titles';
import {message} from '../logs/MessageBuilder';
import {IdentifySpacesDeferred} from '../underworld/IdentifySpacesDeferred';
import {ClaimSpacesDeferred} from '../underworld/ClaimSpacesDeferred';
import {ExcavateSpacesDeferred} from '../underworld/ExcavateSpacesDeferred';
import {UnderworldExpansion} from '../underworld/UnderworldExpansion';
import {SelectResource} from '../inputs/SelectResource';
import {RemoveResourcesFromCard} from '../deferredActions/RemoveResourcesFromCard';
import {isIProjectCard} from '../cards/IProjectCard';
import {MAXIMUM_HABITAT_RATE, MAXIMUM_LOGISTICS_RATE, MAXIMUM_MINING_RATE, MAX_OCEAN_TILES, MAX_OXYGEN_LEVEL, MAX_TEMPERATURE, MAX_VENUS_SCALE} from '../../common/constants';
import {CardName} from '../../common/cards/CardName';
import {asArray, inplaceRemove} from '../../common/utils/utils';
import {SelectCard} from '../inputs/SelectCard';

export class Executor implements BehaviorExecutor {
  public canExecute(behavior: Behavior, player: IPlayer, card: ICard, canAffordOptions?: CanAffordOptions) {
    const ctx = new Counter(player, card);
    const asTrSource = this.toTRSource(behavior, ctx);
    const game = player.game;

    if (behavior.production && !player.production.canAdjust(ctx.countUnits(behavior.production))) {
      return false;
    }

    if (behavior.or) {
      if (!behavior.or.behaviors.some((behavior) => this.canExecute(behavior, player, card, canAffordOptions))) {
        return false;
      }
    }

    if (behavior.drawCard !== undefined) {
      const drawCard = behavior.drawCard;
      const count = typeof(drawCard) === 'number' ? drawCard : ctx.count(drawCard.count);
      if (game.projectDeck.canDraw(count) === false) {
        return false;
      }
    }

    if (behavior.global !== undefined) {
      const g = behavior.global;
      if (g.temperature !== undefined && game.getTemperature() >= MAX_TEMPERATURE) {
        card.warnings.add('maxtemp');
      }
      if (g.oxygen !== undefined && game.getOxygenLevel() >= MAX_OXYGEN_LEVEL) {
        card.warnings.add('maxoxygen');
      }
      if (g.venus !== undefined && game.getVenusScaleLevel() >= MAX_VENUS_SCALE) {
        card.warnings.add('maxvenus');
      }
    }

    if (behavior.ocean !== undefined && game.board.getOceanSpaces().length >= MAX_OCEAN_TILES) {
      card.warnings.add('maxoceans');
    }

    if (behavior.stock !== undefined) {
      const stock = behavior.stock;
      // Only supporting positive values for now.
      // (Also supporting Countable because it's a pain.)
      if (Units.keys.some((key) => {
        const v = stock[key];
        return (typeof v === 'number') ? v < 0 : false;
      })) {
        throw new Error('Not supporting negative units for now: ' + card.name);
      }

      // if (!player.hasUnits(behavior.stock)) {
      //   return false;
      // }
    }

    // TODO(kberg): Spend is not combined with PredictedCost.
    if (behavior.spend !== undefined) {
      const spend = behavior.spend;
      if (spend.megacredits && !player.canAfford(spend.megacredits)) {
        return false;
      }
      if (spend.steel && player.steel < spend.steel) {
        return false;
      }
      if (spend.titanium && player.titanium < spend.titanium) {
        return false;
      }
      if (spend.plants && player.plants < spend.plants) {
        return false;
      }
      if (spend.energy) {
        if (player.energy < spend.energy) {
          return false;
        }
        if (!player.canAfford({
          cost: 0,
          reserveUnits: Units.of({energy: spend.energy}),
          tr: asTrSource,
        })) {
          return false;
        }
      }
      if (spend.heat) {
        if (player.availableHeat() < spend.heat) {
          return false;
        }
        if (!player.canAfford({
          cost: 0,
          reserveUnits: Units.of({heat: spend.heat}),
          tr: asTrSource,
        })) {
          return false;
        }
      }
      if (spend.resourcesHere) {
        if (card.resourceCount < spend.resourcesHere) {
          return false;
        }
        if (!player.canAfford({cost: 0, tr: asTrSource})) {
          return false;
        }
      }
      if (spend.resourceFromAnyCard && player.getCardsWithResources(spend.resourceFromAnyCard.type).length === 0) {
        return false;
      }
      if (spend.corruption && player.underworldData.corruption < spend.corruption) {
        return false;
      }
      if (spend.cards) {
        if (player.cardsInHand.filter((c) => card !== c).length < spend.cards) {
          return false;
        }
      }
    }

    if (behavior.decreaseAnyProduction !== undefined) {
      if (!game.isSoloMode()) {
        const dap = behavior.decreaseAnyProduction;
        const targets = game.players.filter((p) => p.canHaveProductionReduced(dap.type, dap.count, player));

        if (targets.length === 0) {
          return false;
        }
        if (targets.length === 1 && targets[0] === player) {
          card.warnings.add('decreaseOwnProduction');
        }
      }
    }

    if (behavior.colonies?.buildColony !== undefined) {
      if (player.colonies.getPlayableColonies(behavior.colonies.buildColony.allowDuplicates).length === 0) {
        return false;
      }
    }

    if (behavior.city !== undefined) {
      if (behavior.city.space === undefined) {
        if (game.board.getAvailableSpacesForType(player, behavior.city.on ?? 'city', canAffordOptions).length === 0) {
          return false;
        }
      } else {
        // Special case for Star Vegas. The space may already be occupied.
        if (game.board.getSpaceOrThrow(behavior.city.space).tile !== undefined) {
          return false;
        }
      }
    }

    if (behavior.greenery !== undefined) {
      const spaces = game.board.getAvailableSpacesForType(player, behavior.greenery.on ?? 'greenery', canAffordOptions);
      const filtered = game.board.filterSpacesAroundRedCity(spaces);
      if (filtered.length === 0) {
        return false;
      }
    }

    if (behavior.tile !== undefined) {
      if (game.board.getAvailableSpacesForType(player, behavior.tile.on, canAffordOptions).length === 0) {
        return false;
      }
    }

    if (behavior.addResourcesToAnyCard !== undefined) {
      const arctac = behavior.addResourcesToAnyCard;
      if (!Array.isArray(arctac) && arctac.mustHaveCard === true) {
        const action = new AddResourcesToCard(player, arctac.type, {
          count: ctx.count(arctac.count),
          restrictedTag: arctac.tag,
          min: arctac.min,
          robotCards: arctac.robotCards !== undefined,
        });
        const cards = action.getCards();
        if (cards.length === 0) {
          return false;
        }
        // Not playable if the behavior is based on spending a resource
        // from itself to add to itself, like Applied Science.
        if (cards.length === 1 && (behavior.spend?.resourcesHere ?? 0 > 0)) {
          // TODO(kberg): also check wither arctac.min + spend is enough.
          // but that's just to make this future-proof.
          if (cards[0]?.name === card.name) {
            return false;
          }
        }
      }
    }

    // if (behavior.removeResourcesFromAnyCard !== undefined) {
    //   const rrfac = behavior.removeResourcesFromAnyCard;
    //   if (rrfac.tag !== undefined || rrfac.count !== 1) {
    //     throw new Error('Tag and sophisticated counts are not yet implemented.');
    //   }
    //   if (player.getCardsWithResources(behavior.removeResourcesFromAnyCard.type).length === 0) {
    //     return false;
    //   }
    // }

    if (behavior.turmoil) {
      const turmoil = Turmoil.getTurmoil(game);
      if (behavior.turmoil.sendDelegates) {
        const count = ctx.count(behavior.turmoil.sendDelegates.count);
        if (turmoil.getAvailableDelegateCount(player) < count) {
          return false;
        }
      }
    }

    if (behavior.moon !== undefined) {
      const moon = behavior.moon;
      const moonData = MoonExpansion.moonData(game);
      if (moon.habitatTile !== undefined && moon.habitatTile.space === undefined) {
        if (moonData.moon.getAvailableSpacesOnLand(player).length === 0) {
          return false;
        }
      }
      if (moon.mineTile !== undefined && moon.mineTile.space === undefined) {
        if (moonData.moon.getAvailableSpacesForMine(player).length === 0) {
          return false;
        }
      }
      if (moon.roadTile !== undefined && moon.roadTile.space === undefined) {
        if (moonData.moon.getAvailableSpacesOnLand(player).length === 0) {
          return false;
        }
      }
      if ((moon.habitatRate ?? 0) >= MAXIMUM_HABITAT_RATE) {
        card.warnings.add('maxHabitatRate');
      }
      if ((moon.miningRate ?? 0) >= MAXIMUM_MINING_RATE) {
        card.warnings.add('maxMiningRate');
      }
      if ((moon.logisticsRate ?? 0) >= MAXIMUM_LOGISTICS_RATE) {
        card.warnings.add('maxLogisticsRate');
      }
    }

    if (behavior.underworld !== undefined) {
      const underworld = behavior.underworld;
      if (underworld.identify !== undefined) {
        const count = typeof(underworld.identify) === 'number' ? underworld.identify : underworld.identify.count;
        if (UnderworldExpansion.canIdentifyN(player, count) === false) {
          return false;
        }
        // Right now identifies are always more than excavates, so there's no reason to count excavates.
      }

      if (underworld.excavate !== undefined) {
        const excavate = underworld.excavate;
        const count = typeof(excavate) === 'number' ? excavate : ctx.count(excavate.count);
        if (UnderworldExpansion.canExcavateN(player, count) === false) {
          return false;
        }
      }
    }

    return true;
  }

  public execute(behavior: Behavior, player: IPlayer, card: ICard) {
    const ctx = new Counter(player, card);

    if (behavior.or !== undefined) {
      const options = behavior.or.behaviors
        .filter((behavior) => this.canExecute(behavior, player, card))
        .map((behavior) => {
          return new SelectOption(behavior.title)
            .andThen(() => {
              this.execute(behavior, player, card);
              return undefined;
            });
        });

      if (options.length === 1 && behavior.or.autoSelect === true) {
        options[0].cb(undefined);
      } else {
        player.defer(new OrOptions(...options));
      }
    }

    if (behavior.spend !== undefined) {
      const spend = behavior.spend;
      const remainder = {...behavior};
      delete remainder['spend'];

      if (spend.megacredits) {
        player.game.defer(new SelectPaymentDeferred(player, spend.megacredits, {
          title: TITLES.payForCardAction(card.name),
        })).andThen(() => this.execute(remainder, player, card));
        // Exit early as the rest of handled by the deferred action.
        return;
      }
      // player.pay triggers Sol Bank.
      player.pay(Payment.of({
        steel: spend.steel ?? 0,
        titanium: spend.titanium ?? 0,
      }));
      if (spend.plants) {
        player.stock.deduct(Resource.PLANTS, spend.plants);
      }
      if (spend.energy) {
        player.stock.deduct(Resource.ENERGY, spend.energy);
      }
      if (spend.heat) {
        player.defer(player.spendHeat(spend.heat, () => {
          this.execute(remainder, player, card);
          return undefined;
        }));
        // Exit early as the rest of handled by the deferred action.
        return;
      }
      if (spend.resourcesHere) {
        player.removeResourceFrom(card, spend.resourcesHere);
      }
      if (spend.resourceFromAnyCard) {
        player.game.defer(new RemoveResourcesFromCard(player, spend.resourceFromAnyCard.type, 1, {source: 'self', blockable: false}))
          .andThen(() => this.execute(remainder, player, card));
        // Exit early as the rest of handled by the deferred action.
        return;
      }
      if (spend.corruption) {
        UnderworldExpansion.loseCorruption(player, spend.corruption);
      }
      if ((spend.cards ?? 0) > 0) {
        const count: number = spend.cards ?? 0;
        const cards = player.cardsInHand.filter((c) => card !== c);
        player.defer(
          new SelectCard(
            message('Select ${0} card(s) to discard', (b) => b.number(count)),
            undefined,
            cards,
            {min: count, max: count},
          ).andThen((cards) => {
            for (const c of cards) {
              inplaceRemove(player.cardsInHand, c);
              player.game.projectDeck.discard(c);
            }
            this.execute(remainder, player, card);
            return undefined;
          }),
        );
        // Exit early as the rest of handled by the deferred action.
        return;
      }
    }

    if (behavior.production !== undefined) {
      const units = ctx.countUnits(behavior.production);
      player.production.adjust(units, {log: true});
    }
    if (behavior.stock) {
      const units = ctx.countUnits(behavior.stock);
      player.stock.adjust(units, {log: true});
    }
    if (behavior.standardResource) {
      const entry = behavior.standardResource;
      const count = typeof(entry) === 'number' ? entry : entry.count;
      const same = typeof(entry) === 'number' ? true : entry.same ?? true;
      if (same === false) {
        player.defer(
          new SelectResources(message('Gain ${0} standard resources', (b) => b.number(count)), count)
            .andThen((units) => {
              player.stock.adjust(units, {log: true});
              return undefined;
            }));
      } else {
        player.defer(
          new SelectResource(message('Gain ${0} units of a standard resource', (b) => b.number(count)))
            .andThen((unit) => {
              player.stock.add(Units.ResourceMap[unit], count, {log: true});
              return undefined;
            }));
      }
    }
    if (behavior.steelValue === 1) {
      player.increaseSteelValue();
    }
    if (behavior.titanumValue === 1) {
      player.increaseTitaniumValue();
    }

    if (behavior?.greeneryDiscount) {
      player.plantsNeededForGreenery -= behavior.greeneryDiscount;
    }
    if (behavior.drawCard !== undefined) {
      const drawCard = behavior.drawCard;
      if (typeof(drawCard) === 'number') {
        player.drawCard(drawCard);
      } else {
        // This conditional could probably be removed, using the else clause for both.
        if (drawCard.keep === undefined && drawCard.pay === undefined) {
          player.drawCard(ctx.count(drawCard.count), {tag: drawCard.tag, resource: drawCard.resource, cardType: drawCard.type});
        } else {
          player.drawCardKeepSome(ctx.count(drawCard.count), {
            tag: drawCard.tag,
            resource: drawCard.resource,
            cardType: drawCard.type,
            keepMax: drawCard.keep,
            paying: drawCard.pay,
          });
        }
      }
    }

    if (behavior.global !== undefined) {
      const g = behavior.global;
      if (g.temperature !== undefined) player.game.increaseTemperature(player, g.temperature);
      if (g.oxygen !== undefined) player.game.increaseOxygenLevel(player, g.oxygen);
      if (g.venus !== undefined) player.game.increaseVenusScaleLevel(player, g.venus);
    }

    if (behavior.tr !== undefined) {
      const count = ctx.count(behavior.tr);
      const log = typeof(behavior.tr) === 'object';
      if (count >= 0) {
        player.increaseTerraformRating(count, {log: log});
      } else {
        player.decreaseTerraformRating(-count, {log: log});
      }
    }
    const addResources = behavior.addResources;
    if (addResources !== undefined) {
      if (player.game.inDoubleDown) {
        player.game.log('Resources from ${0} cannot be added to ${1}', (b) => b.card(card).cardName(CardName.DOUBLE_DOWN));
      } else {
        const count = ctx.count(addResources);
        player.defer(() => {
          player.addResourceTo(card, {qty: count, log: true});
          return undefined;
        });
      }
    }

    if (behavior.addResourcesToAnyCard) {
      const array = asArray(behavior.addResourcesToAnyCard);
      for (const arctac of array) {
        const count = ctx.count(arctac.count);
        if (count > 0) {
          player.game.defer(
            new AddResourcesToCard(
              player,
              arctac.type,
              {
                count,
                restrictedTag: arctac.tag,
                min: arctac.min,
                robotCards: arctac.robotCards !== undefined,
              }));
        }
      }
    }

    // if (behavior.removeResourcesFromAnyCard !== undefined) {
    //   throw new Error('not yet');
    // }

    if (behavior.decreaseAnyProduction !== undefined) {
      player.game.defer(new DecreaseAnyProduction(player, behavior.decreaseAnyProduction.type, {count: behavior.decreaseAnyProduction.count}));
    }
    if (behavior.removeAnyPlants !== undefined) {
      player.game.defer(new RemoveAnyPlants(player, behavior.removeAnyPlants));
    }
    if (behavior.colonies !== undefined) {
      const colonies = behavior.colonies;
      if (colonies.buildColony !== undefined) {
        player.game.defer(new BuildColony(player, {allowDuplicate: colonies.buildColony.allowDuplicates}));
      }
      if (colonies.addTradeFleet !== undefined) {
        for (let idx = 0; idx < colonies.addTradeFleet; idx++) {
          player.colonies.increaseFleetSize();
        }
      }
      if (colonies.tradeDiscount !== undefined) {
        player.colonies.tradeDiscount += colonies.tradeDiscount;
      }
      if (colonies.tradeOffset !== undefined) {
        player.colonies.tradeOffset += colonies.tradeOffset;
      }
    }

    if (behavior.ocean !== undefined) {
      if (behavior.ocean.count === 2) {
        player.game.defer(new PlaceOceanTile(player, {title: 'Select space for first ocean'}));
        player.game.defer(new PlaceOceanTile(player, {title: 'Select space for second ocean'}));
      } else {
        player.game.defer(new PlaceOceanTile(player, {on: behavior.ocean.on}));
      }
    }
    if (behavior.city !== undefined) {
      if (behavior.city.space !== undefined) {
        const space = player.game.board.getSpaceOrThrow(behavior.city.space);
        player.game.addCity(player, space);
        if (space.tile !== undefined) { // Should never be undefined
          space.tile.card = card.name;
        }
      } else {
        player.game.defer(new PlaceCityTile(player, {on: behavior.city.on}));
      }
    }
    if (behavior.greenery !== undefined) {
      player.game.defer(new PlaceGreeneryTile(player, behavior.greenery.on));
    }
    if (behavior.tile !== undefined) {
      const tile = behavior.tile;
      player.game.defer(new PlaceTile(player, {
        tile: {
          tileType: tile.type,
          card: card.name,
        },
        on: tile.on,
        title: tile.title ?? message('Select space for ${0} tile', (b) => b.cardName(card.name)),
        adjacencyBonus: tile.adjacencyBonus,
      }));
    }

    if (behavior.turmoil) {
      const turmoil = Turmoil.getTurmoil(player.game);
      if (behavior.turmoil.influenceBonus === 1) {
        turmoil.addInfluenceBonus(player);
      }

      if (behavior.turmoil.sendDelegates) {
        const sendDelegates = behavior.turmoil.sendDelegates;
        const count = ctx.count(sendDelegates.count);
        if (sendDelegates.manyParties) {
          for (let i = 0; i < count; i++) {
            player.game.defer(new SendDelegateToArea(player, 'Select where to send delegate'));
          }
        } else {
          player.game.defer(new SendDelegateToArea(player, `Select where to send ${sendDelegates.count} delegates`, {count: count}));
        }
      }
    }

    if (behavior.moon !== undefined) {
      const moon = behavior.moon;
      if (moon.habitatTile !== undefined) {
        if (moon.habitatTile.space === undefined) {
          player.game.defer(new PlaceMoonHabitatTile(player));
        } else {
          MoonExpansion.addHabitatTile(player, moon.habitatTile.space, card?.name);
          MoonExpansion.raiseHabitatRate(player);
        }
      }
      if (moon.mineTile !== undefined) {
        if (moon.mineTile.space === undefined) {
          player.game.defer(new PlaceMoonMineTile(player));
        } else {
          MoonExpansion.addMineTile(player, moon.mineTile.space, card?.name);
          MoonExpansion.raiseMiningRate(player);
        }
      }
      if (moon.roadTile !== undefined) {
        if (moon.roadTile.space === undefined) {
          player.game.defer(new PlaceMoonRoadTile(player));
        } else {
          MoonExpansion.addRoadTile(player, moon.roadTile.space, card?.name);
          MoonExpansion.raiseLogisticRate(player);
        }
      }
      if (moon.tile !== undefined) {
        if (moon.tile.space !== undefined) {
          MoonExpansion.addTile(player, moon.tile.space, {tileType: moon.tile.type, card: card?.name});
        } else {
          player.game.defer(new PlaceSpecialMoonTile(player, {tileType: moon.tile.type, card: card?.name}));
        }
      }
      if (moon.habitatRate !== undefined) MoonExpansion.raiseHabitatRate(player, moon.habitatRate);
      if (moon.miningRate !== undefined) MoonExpansion.raiseMiningRate(player, moon.miningRate);
      if (moon.logisticsRate !== undefined) MoonExpansion.raiseLogisticRate(player, moon.logisticsRate);
    }

    if (behavior.underworld !== undefined) {
      const underworld = behavior.underworld;
      const identify = underworld.identify;
      if (identify !== undefined) {
        if (typeof(identify) === 'number') {
          player.game.defer(new IdentifySpacesDeferred(player, identify));
        } else {
          const deferred = player.game.defer(new IdentifySpacesDeferred(player, identify.count));
          const claim = identify.claim ?? 0;
          if (claim > 0) {
            deferred.andThen((spaces) => {
              player.game.defer(new ClaimSpacesDeferred(player, ctx.count(claim), spaces));
            });
          }
        }
      }
      if (underworld.excavate !== undefined) {
        const excavate = underworld.excavate;
        if (typeof(excavate) === 'number') {
          player.game.defer(new ExcavateSpacesDeferred(player, excavate));
        } else {
          player.game.defer(new ExcavateSpacesDeferred(
            player, ctx.count(excavate.count), excavate.ignorePlacementRestrictions));
        }
      }
      if (underworld.corruption !== undefined) {
        UnderworldExpansion.gainCorruption(player, ctx.count(underworld.corruption), {log: true});
      }
      if (underworld.markThisGeneration !== undefined) {
        if (isIProjectCard(card)) {
          card.generationUsed = player.game.generation;
        }
      }
    }

    if (behavior.log !== undefined) {
      this.log(behavior.log, player, card);
    }
  }

  private log(message: string, player: IPlayer, card: ICard) {
    const replaced = message
      .replaceAll('${player}', '${0}')
      .replaceAll('${card}', '${1}');
    player.game.log(replaced, (b) => b.player(player).card(card));
  }

  public onDiscard(behavior: Behavior, player: IPlayer, _card: ICard) {
    if (behavior.steelValue === 1) {
      player.decreaseSteelValue();
    }
    if (behavior.titanumValue === 1) {
      player.decreaseTitaniumValue();
    }

    if (behavior?.greeneryDiscount) {
      player.plantsNeededForGreenery += behavior.greeneryDiscount;
    }

    if (behavior.colonies !== undefined) {
      const colonies = behavior.colonies;
      if (colonies.addTradeFleet !== undefined) {
        for (let idx = 0; idx < colonies.addTradeFleet; idx++) {
          player.colonies.decreaseFleetSize();
        }
      }
      if (colonies.tradeDiscount !== undefined) {
        player.colonies.tradeDiscount -= colonies.tradeDiscount;
      }
      if (colonies.tradeOffset !== undefined) {
        player.colonies.tradeOffset -= colonies.tradeOffset;
      }
    }
  }

  public toTRSource(behavior: Behavior, ctx: ICounter): TRSource {
    let tr: number | undefined = undefined;
    if (behavior.tr !== undefined) {
      if (typeof(behavior.tr) === 'number') {
        tr = behavior.tr;
      } else {
        tr = ctx.count(behavior.tr);
      }
    }

    // TODO(kberg): Use undefined instead of 0.
    const trSource: TRSource = {
      tr: tr,
      temperature: behavior.global?.temperature,
      oxygen: (behavior.global?.oxygen ?? 0) + (behavior.greenery !== undefined ? 1 : 0),
      venus: behavior.global?.venus,
      oceans: behavior.ocean !== undefined ? (behavior.ocean.count ?? 1) : undefined,

      moonHabitat: (behavior.moon?.habitatRate ?? 0) + (behavior.moon?.habitatTile !== undefined ? 1 : 0),
      moonMining: (behavior.moon?.miningRate ?? 0) + (behavior.moon?.mineTile !== undefined ? 1 : 0),
      moonLogistics: (behavior.moon?.logisticsRate ?? 0) + (behavior.moon?.roadTile !== undefined ? 1 : 0),
    };
    return trSource;
  }
}
