import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Player} from '../../Player';
import {CardName} from '../../../common/cards/CardName';
import {ALL_RESOURCES} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';
import {CardResource} from '../../../common/CardResource';
import {OrOptions} from '../../inputs/OrOptions';
import {SelectOption} from '../../inputs/SelectOption';
import {Size} from '../../../common/cards/render/Size';
import {message} from '../../logs/MessageBuilder';
import {SelectResource} from '../../inputs/SelectResource';
import {Units} from '../../../common/Units';

export class CloneTroopers extends Card implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.CLONE_TROOPERS,
      tags: [Tag.SCIENCE],
      cost: 12,
      resourceType: CardResource.CLONE_TROOPER,
      requirements: {oceans: 6},
      victoryPoints: {resourcesHere: {}},

      metadata: {
        cardNumber: 'SW02',
        renderData: CardRenderer.builder((b) => {
          b.arrow(Size.SMALL).resource(CardResource.CLONE_TROOPER).or().resource(CardResource.CLONE_TROOPER).arrow(Size.SMALL).text('STEAL', Size.SMALL).wild(1, {all});
          b.br;
          b.text('(Action: Add one Clone Trooper to this card OR remove one Clone Trooper from this card to steal one standard resource from any player.)', Size.TINY, false, false);
        }),
        description: 'Requires 6 ocean tiles. 1 VP per Clone Trooper on this card.',
      },
    });
  }

  public canAct(): boolean {
    return true;
  }

  public action(player: Player) {
    if (this.resourceCount > 0) {
      const options = new OrOptions();
      options.options.push(new SelectOption('Add a Clone Trooper to this card').andThen(() => {
        player.addResourceTo(this, {log: true});
        return undefined;
      }));
      if (player.game.isSoloMode()) {
        options.options.push(new SelectResource('Steal a resource')
          .andThen((resource) => {
            player.stock.add(Units.ResourceMap[resource], 1);
            player.removeResourceFrom(this, 1);
            return undefined;
          }));
      } else {
        for (const resource of ALL_RESOURCES) {
          for (const target of player.opponents) {
            if (target.isProtected(resource) || target.stock.get(resource) < 1) {
              continue;
            }
            options.options.push(new SelectOption(
              message('Steal 1 ${0} from ${1}', (b) => b.string(resource).player(target)), 'steal').andThen(() => {
              player.removeResourceFrom(this, 1);
              target.attack(player, resource, 1, {log: true, stealing: true});
              return undefined;
            }));
          }
        }
      }
      if (options.options.length > 1) {
        return options;
      }
    }

    // Fallback.
    player.addResourceTo(this, {log: true});
    return undefined;
  }
}
