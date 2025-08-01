import {CardType} from '../../../common/cards/CardType';
import {IProjectCard} from '../IProjectCard';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {Card} from '../Card';
import {Tag} from '../../../common/cards/Tag';
import {CardResource} from '../../../common/CardResource';

export class UndergroundHabitat extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.UNDERGROUND_HABITAT,
      cost: 12,
      tags: [Tag.BUILDING, Tag.PLANT, Tag.ANIMAL],

      behavior: {
        production: {plants: 1},
        addResourcesToAnyCard: {count: 1, type: CardResource.ANIMAL, autoSelect: true},
        underworld: {excavate: 1},
      },

      metadata: {
        cardNumber: 'U071',
        renderData: CardRenderer.builder((b) => {
          b.excavate(1).production((pb) => pb.plants(1)).resource(CardResource.ANIMAL).asterix();
        }),
        description: 'Excavate an underground resource. Increase your plant production 1 step. Add 1 animal on another card.',
      },
    });
  }
}
