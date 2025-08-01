import {Space} from './Space';
import {CanAffordOptions, IPlayer} from '../IPlayer';
import {PlayerId, SpaceId} from '../../common/Types';
import {SpaceType} from '../../common/boards/SpaceType';
import {BASE_OCEAN_TILES, CITY_TILES, GREENERY_TILES, HAZARD_TILES, OCEAN_TILES, TileType} from '../../common/TileType';
import {SerializedBoard, SerializedSpace} from './SerializedBoard';
import {CardName} from '../../common/cards/CardName';
import {AresHandler} from '../ares/AresHandler';
import {Units} from '../../common/Units';
import {hazardSeverity} from '../../common/AresTileType';
import {TR_SOURCES, TRSource} from '../../common/cards/TRSource';
import {sum} from '../../common/utils/utils';

/**
 * The bonus costs to place a tile on a space. For instance, spending 6MC to place an ocean,
 * or spending production to cover an Ares hazard.
 */
export type SpaceCosts = {
  megacredits: number,
  production: number,
  tr: TRSource,
};

/**
 * A representation of any hex board. This is normally Mars (Tharsis, Hellas, Elysium) but can also be The Moon.
 *
 * It also includes additional spaces, known as Colonies, that are not adjacent to other spaces.
 */
export abstract class Board {
  private maxX: number = 0;
  private maxY: number = 0;
  private map: Map<SpaceId, Space> = new Map();

  // stores adjacent spaces in clockwise order starting from the top left
  private readonly adjacentSpaces = new Map<SpaceId, ReadonlyArray<Space>>();

  protected constructor(
    public readonly spaces: ReadonlyArray<Space>,
    public readonly noctisCitySpaceId: SpaceId | undefined,
    public readonly volcanicSpaceIds: ReadonlyArray<SpaceId>) {
    this.maxX = Math.max(...spaces.map((s) => s.x));
    this.maxY = Math.max(...spaces.map((s) => s.y));
    spaces.forEach((space) => {
      const adjacentSpaces = this.computeAdjacentSpaces(space);
      const filtered = adjacentSpaces.filter((space) => space !== undefined);
      // "as ReadonlyArray<Space> is OK because the line above filters out the undefined values."
      this.adjacentSpaces.set(space.id, filtered as ReadonlyArray<Space>);
      this.map.set(space.id, space);
    });
  }

  /* Returns the space given a Space ID. */
  public getSpaceOrThrow(id: SpaceId): Space {
    const space = this.map.get(id);
    if (space === undefined) {
      throw new Error(`Can't find space with id ${id}`);
    }
    return space;
  }

  protected computeAdjacentSpaces(space: Space): ReadonlyArray<Space | undefined> {
    // Expects an odd number of rows. If a funny shape appears, it can be addressed.
    const middleRow = this.maxY / 2;
    if (space.spaceType !== SpaceType.COLONY) {
      if (space.y < 0 || space.y > this.maxY) {
        throw new Error('Unexpected space y value: ' + space.y);
      }
      if (space.x < 0 || space.x > this.maxX) {
        throw new Error('Unexpected space x value: ' + space.x);
      }
      const leftSpace: Array<number> = [space.x - 1, space.y];
      const rightSpace: Array<number> = [space.x + 1, space.y];
      const topLeftSpace: Array<number> = [space.x, space.y - 1];
      const topRightSpace: Array<number> = [space.x, space.y - 1];
      const bottomLeftSpace: Array<number> = [space.x, space.y + 1];
      const bottomRightSpace: Array<number> = [space.x, space.y + 1];
      if (space.y < middleRow) {
        bottomLeftSpace[0]--;
        topRightSpace[0]++;
      } else if (space.y === middleRow) {
        bottomRightSpace[0]++;
        topRightSpace[0]++;
      } else {
        bottomRightSpace[0]++;
        topLeftSpace[0]--;
      }
      // Coordinates are in clockwise order. Order only ever matters during solo game set-up when
      // placing starting forests. Since that is the only case where ordering matters, it is
      // adopted here.
      const coords = [
        topLeftSpace,
        topRightSpace,
        rightSpace,
        bottomRightSpace,
        bottomLeftSpace,
        leftSpace,
      ];
      const spaces = coords.map(([x, y]) =>
        this.spaces.find((adj) =>
          adj.x === x && adj.y === y &&
          space !== adj && adj.spaceType !== SpaceType.COLONY,
        ));
      return spaces;
    }
    return [];
  }

  // Returns adjacent spaces in clockwise order starting from the top left.
  public getAdjacentSpaces(space: Space): ReadonlyArray<Space> {
    const spaces = this.adjacentSpaces.get(space.id);
    if (spaces === undefined) {
      throw new Error(`Unexpected space ID ${space.id}`);
    }
    return spaces;
  }

  //  Returns spaces in order from the top left.
  //
  //   0 1
  //  5 x 2
  //   4 3
  //
  // If there is no space in that spot, the index is undefined.
  // If the space is invalid or is a colony, this returns an unreliable value.
  public getAdjacentSpacesClockwise(space: Space): ReadonlyArray<Space | undefined> {
    return this.computeAdjacentSpaces(space);
  }

  public getSpaceByTileCard(cardName: CardName): Space | undefined {
    return this.spaces.find((space) => space.tile?.card === cardName);
  }

  public getSpaces(spaceType: SpaceType): ReadonlyArray<Space> {
    // TODO(kberg): How to make this not bother with the special case when
    // Underworld is not in play? It's not very expensive.
    if (spaceType !== SpaceType.OCEAN) {
      return this.spaces.filter((space) => space.spaceType === spaceType);
    } else {
      return this.spaces.filter((space) => space.spaceType === spaceType || space.undergroundResources === 'volcanicoceanspace');
    }
  }

  /**
   * Update `costs` with any costs for this `space`.
   *
   * @returns `true` when costs has changed, `false` when it has not.
   */
  protected spaceCosts(_space: Space): SpaceCosts {
    return {megacredits: 0, production: 0, tr: {}};
  }

  private computeAdditionalCosts(space: Space, aresExtension: boolean, multiplier: number | undefined): SpaceCosts {
    const costs: SpaceCosts = this.spaceCosts(space);
    if (multiplier !== undefined) {
      costs.megacredits *= multiplier;
      for (const key of TR_SOURCES) {
        const val = costs.tr[key];
        if (val !== undefined) {
          costs.tr[key] = val * multiplier;
        }
      }
    }

    if (aresExtension === false) {
      return costs;
    }

    switch (hazardSeverity(space.tile?.tileType)) {
    case 'mild':
      costs.megacredits += 8;
      break;
    case 'severe':
      costs.megacredits += 16;
      break;
    }

    for (const adjacentSpace of this.getAdjacentSpaces(space)) {
      switch (hazardSeverity(adjacentSpace.tile?.tileType)) {
      case 'mild':
        costs.production += 1;
        break;
      case 'severe':
        costs.production += 2;
        break;
      }
      if (adjacentSpace.adjacency !== undefined) {
        const adjacency = adjacentSpace.adjacency;
        costs.megacredits += adjacency.cost ?? 0;
        // TODO(kberg): offset costs with heat and MC bonuses.
        // for (const bonus of adjacency.bonus) {
        //   case (bonus) {
        //     switch SpaceBonus.MEGACREDITS:
        //       costs.stock.megacredits--;
        //     switch SpaceBonus.MEGACREDITS:
        //       costs.stock.megacredits--;
        //   }
        // }
      }
    }
    return costs;
  }

  public canAfford(player: IPlayer, space: Space, canAffordOptions?: CanAffordOptions) {
    const additionalCosts = this.computeAdditionalCosts(space, player.game.gameOptions.aresExtension, canAffordOptions?.bonusMultiplier);
    if (additionalCosts.megacredits > 0) {
      const plan: CanAffordOptions = canAffordOptions !== undefined ? {...canAffordOptions} : {cost: 0, tr: {}};
      plan.cost += additionalCosts.megacredits;
      plan.tr = additionalCosts.tr;

      if (space.undergroundResources === 'place6mc') {
        plan.cost -= 6;
      }

      const afford = player.canAfford(plan);
      if (afford === false) {
        return false;
      }
    }
    if (additionalCosts.production > 0) {
      // +5 because megacredits goes to -5
      const availableProduction = sum(Units.values(player.production)) + 5;
      return availableProduction > additionalCosts.production;
    }
    return true;
  }

  public getAvailableSpacesOnLand(player: IPlayer, canAffordOptions?: CanAffordOptions): ReadonlyArray<Space> {
    // Does this also apply to cove spaces?
    const landSpaces = this.getSpaces(SpaceType.LAND).filter((space) => {
      // A space is available if it doesn't have a player marker on it, or it belongs to |player|
      if (space.player !== undefined && space.player !== player) {
        return false;
      }

      if (space.id === this.noctisCitySpaceId) {
        return false;
      }

      const playableSpace = space.tile === undefined || (AresHandler.hasHazardTile(space) && space.tile?.protectedHazard !== true);

      if (!playableSpace) {
        return false;
      }

      if (space.id === player.game.nomadSpace) {
        return false;
      }

      return this.canAfford(player, space, canAffordOptions);
    });
    return landSpaces;
  }

  // |distance| represents the number of eligible spaces from the top left (or bottom right)
  // to count. So distance 0 means the first available space.
  // |direction| describes whether counting starts from the top left or bottom right.
  // |predicate| allows callers to provide additional filtering of eligible spaces.
  public getNthAvailableLandSpace(
    distance: number,
    direction: 'top' | 'bottom',
    predicate: (value: Space) => boolean = (_x) => true): Space {
    const spaces = this.spaces.filter((space) => {
      return this.canPlaceTile(space) && space.player === undefined;
    }).filter(predicate);
    if (spaces.length === 0) {
      throw new Error('no spaces available');
    }
    let idx = (direction === 'top') ? distance : (spaces.length - (distance + 1));
    while (idx < 0) {
      idx += spaces.length;
    }
    while (idx >= spaces.length) {
      idx -= spaces.length;
    }
    return spaces[idx];
  }

  public canPlaceTile(space: Space): boolean {
    return space.tile === undefined && space.spaceType === SpaceType.LAND && space.id !== this.noctisCitySpaceId;
  }

  public static isCitySpace(space: Space): boolean {
    return space.tile !== undefined && CITY_TILES.has(space.tile.tileType);
  }

  // Returns true when the space has an ocean tile or any derivative tiles (ocean city, wetlands)
  public static isOceanSpace(space: Space): boolean {
    return space.tile !== undefined && OCEAN_TILES.has(space.tile.tileType);
  }

  /**
   *  Returns true when the space is an ocean tile that is not used to cover another ocean.
   *
   * Used for benefits associated with "when a player places an ocean tile"
   */
  public static isUncoveredOceanSpace(space: Space): boolean {
    return space.tile !== undefined && BASE_OCEAN_TILES.has(space.tile.tileType);
  }

  public static isGreenerySpace(space: Space): boolean {
    return space.tile !== undefined && GREENERY_TILES.has(space.tile.tileType);
  }

  public static ownedBy(player: IPlayer): (space: Space) => boolean {
    return (space: Space) => space.player?.id === player.id;
  }

  public static spaceOwnedBy(space: Space, player: IPlayer): boolean {
    return Board.ownedBy(player)(space);
  }

  public getHazards(): ReadonlyArray<Space> {
    return this.spaces.filter((space) => space.tile && HAZARD_TILES.has(space.tile.tileType));
  }

  /** Hazard tiles don't really count as tiles. */
  public static hasRealTile(space: Space) {
    return space.tile !== undefined && HAZARD_TILES.has(space.tile.tileType) === false;
  }

  public serialize(): SerializedBoard {
    return {
      spaces: this.spaces.map((space) => {
        const serialized: SerializedSpace = {
          id: space.id,
          spaceType: space.spaceType,
          tile: space.tile,
          player: space.player?.id,
          bonus: space.bonus,
          adjacency: space.adjacency,
          x: space.x,
          y: space.y,
        };
        if (space.undergroundResources !== undefined) {
          serialized.undergroundResources = space.undergroundResources;
        }
        if (space.excavator !== undefined) {
          serialized.excavator = space.excavator.id;
        }
        if (space.coOwner !== undefined) {
          serialized.coOwner = space.coOwner.id;
        }

        return serialized;
      }),
    };
  }

  private static findPlayer(players: ReadonlyArray<IPlayer>, playerId: PlayerId | undefined) {
    return players.find((p) => p.id === playerId);
  }

  public static deserializeSpace(serialized: SerializedSpace, players: ReadonlyArray<IPlayer>): Space {
    const player = this.findPlayer(players, serialized.player);
    const excavator = this.findPlayer(players, serialized.excavator);
    const coOwner = this.findPlayer(players, serialized.coOwner);
    const space: Space = {
      id: serialized.id,
      spaceType: serialized.spaceType,
      bonus: serialized.bonus,
      x: serialized.x,
      y: serialized.y,
    };

    if (serialized.tile !== undefined) {
      space.tile = serialized.tile;
    }
    if (player !== undefined) {
      space.player = player;
    }
    if (serialized.adjacency !== undefined) {
      space.adjacency = serialized.adjacency;
    }
    if (serialized.undergroundResources !== undefined) {
      space.undergroundResources = serialized.undergroundResources;
    }
    if (excavator !== undefined) {
      space.excavator = excavator;
    }
    if (coOwner !== undefined) {
      space.coOwner = coOwner;
    }
    return space;
  }

  public static deserialize(board: SerializedBoard, players: ReadonlyArray<IPlayer>): {spaces: Array<Space>} {
    const spaces = board.spaces.map((space) => Board.deserializeSpace(space, players));
    return {spaces};
  }
}

export function isSpecialTile(tileType: TileType | undefined): boolean {
  switch (tileType) {
  case TileType.GREENERY:
  case TileType.OCEAN:
  case TileType.CITY:
  case TileType.MOON_HABITAT:
  case TileType.MOON_MINE:
  case TileType.MOON_ROAD:
  case TileType.EROSION_MILD: // Hazard tiles are "special" but they don't count for the typical intent of what a special tile represents.
  case TileType.EROSION_SEVERE:
  case TileType.DUST_STORM_MILD:
  case TileType.DUST_STORM_SEVERE:
  case TileType.REY_SKYWALKER:
  case undefined:
    return false;
  default:
    return true;
  }
}

export function isSpecialTileSpace(space: Space): boolean {
  return isSpecialTile(space.tile?.tileType);
}
