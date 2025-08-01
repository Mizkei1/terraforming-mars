import {ICorporationCard} from '../corporation/ICorporationCard';
import {CorporationCard} from '../corporation/CorporationCard';
import {IPlayer} from '../../IPlayer';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ColoniesHandler} from '../../colonies/ColoniesHandler';
import {SerializedCard} from '../../SerializedCard';
import {ICard} from '../ICard';

export class Aridor extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.ARIDOR,
      startingMegaCredits: 40,
      initialActionText: 'Add a colony tile',

      metadata: {
        cardNumber: 'R20',
        description: 'You start with 40 M€. As your first action, put an additional Colony Tile of your choice into play',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(40).nbsp.colonyTile();
          b.corpBox('effect', (ce) => {
            ce.effect('When you get a new type of tag in play [event cards do not count], increase your M€ production 1 step.', (eb) => {
              eb.diverseTag().startEffect.production((pb) => pb.megacredits(1));
            });
          });
        }),
      },
    });
  }
  public allTags = new Set<Tag>();

  private tagsForCard(card: ICard): Array<Tag> {
    if (card.type === CardType.EVENT) {
      return [];
    }
    return card.tags.filter((tag) => tag !== Tag.WILD);
  }

  public override bespokePlay(player: IPlayer) {
    for (const card of player.tableau) {
      for (const tag of this.tagsForCard(card)) {
        this.allTags.add(tag);
      }
    }
    return undefined;
  }

  public override initialAction(player: IPlayer) {
    ColoniesHandler.addColonyTile(
      player,
      {title: 'Aridor first action - Select colony tile to add'},
    );
    return undefined;
  }

  private processTags(player: IPlayer, tags: ReadonlyArray<Tag>) {
    for (const tag of tags) {
      const currentSize = this.allTags.size;
      this.allTags.add(tag);
      if (this.allTags.size > currentSize) {
        player.game.log('${0} gained 1 M€ production from ${1} for the ${2} tag',
          (b) => b.player(player).card(this).string(tag));
        player.production.add(Resource.MEGACREDITS, 1);
      }
    }
  }

  public onNonCardTagAdded(player: IPlayer, tag: Tag) {
    this.processTags(player, [tag]);
  }

  public onCardPlayedForCorps(player: IPlayer, card: ICard) {
    this.processTags(player, this.tagsForCard(card));
  }

  public serialize(serialized: SerializedCard) {
    serialized.allTags = Array.from(this.allTags);
  }

  public deserialize(serialized: SerializedCard) {
    this.allTags = new Set(serialized.allTags);
  }
}
