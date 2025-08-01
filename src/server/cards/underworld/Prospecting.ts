import {IPlayer} from '../../IPlayer';
import {Tag} from '../../../common/cards/Tag';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ColoniesHandler} from '../../colonies/ColoniesHandler';
import {PreludeCard} from '../prelude/PreludeCard';
import {SelectPaymentDeferred} from '../../deferredActions/SelectPaymentDeferred';
import {PathfindersExpansion} from '../../pathfinders/PathfindersExpansion';

export class Prospecting extends PreludeCard {
  constructor() {
    super({
      name: CardName.PROSPECTING,
      startingMegacredits: -4,
      tags: [Tag.SPACE],

      metadata: {
        cardNumber: 'UP13',
        description: 'Pay 4 M€. Put an additional colony tile of your choice into play. Then place a colony on it.',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(-4).nbsp.colonyTile().colonies().asterix();
        }),
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer) {
    return player.canAfford(4);
  }

  public override bespokePlay(player: IPlayer) {
    ColoniesHandler.addColonyTile(player, {
      activateableOnly: true,
      cb: (colony) => {
        if (colony.isActive) {
          colony.addColony(player);
        }
      }});

    player.game.defer(new SelectPaymentDeferred(player, -this.startingMegaCredits)).andThen(() => {
      PathfindersExpansion.addToSolBank(player);
    });

    return undefined;
  }
}
