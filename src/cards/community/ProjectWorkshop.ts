import { CorporationCard } from "../corporation/CorporationCard";
import { Player } from "../../Player";
import { Tags } from "../Tags";
import { CardName } from '../../CardName';
import { CardType } from "../CardType";
import { Game } from "../../Game";
import { LogHelper } from "../../components/LogHelper";
import { IProjectCard } from "../IProjectCard";
import { SelectCard } from "../../inputs/SelectCard";
import { ICard } from "../ICard";
import { LogMessageData } from "../../LogMessageData";
import { LogMessageDataType } from "../../LogMessageDataType";
import { LogMessageType } from "../../LogMessageType";
import { OrOptions } from "../../inputs/OrOptions";
import { SelectOption } from "../../inputs/SelectOption";

export class ProjectWorkshop implements CorporationCard {
    public name: CardName =  CardName.PROJECT_WORKSHOP;
    public tags: Array<Tags> = [Tags.EARTH];
    public startingMegaCredits: number = 39;

    public play(player: Player) {
        player.steel = 1;
        player.titanium = 1;
        return undefined;
    }

    public initialAction(player: Player, game: Game) {
        const drawnCard = game.drawCardsByType(CardType.ACTIVE, 1)[0];
        player.cardsInHand.push(drawnCard);
        this.logCardDraw(game, player, drawnCard);
            
        return undefined;
    }

    public canAct(player: Player): boolean {
        const activeCards = player.getCardsByCardType(CardType.ACTIVE);
        return activeCards.length > 0 || player.megaCredits >= 3;
    }

    public action(player: Player, game: Game) {
        const activeCards = player.getCardsByCardType(CardType.ACTIVE);

        const flipBlueCard = new SelectOption(
            "Flip and discard a played blue card",
            "Select",
            () => {
                if (activeCards.length === 1) {
                    this.convertCardPointsToTR(player, game, activeCards[0]);
                    this.discardPlayedCard(player, game, activeCards[0]);
                    player.cardsInHand.push(game.dealer.dealCard());
                    player.cardsInHand.push(game.dealer.dealCard());
        
                    return undefined;
                }
        
                return new SelectCard(
                    "Select active card to discard",
                    "Discard",
                    activeCards as Array<ICard>,
                    (foundCards: Array<ICard>) => {
                        this.convertCardPointsToTR(player, game, foundCards[0]);
                        this.discardPlayedCard(player, game, foundCards[0]);
                        player.cardsInHand.push(game.dealer.dealCard());
                        player.cardsInHand.push(game.dealer.dealCard());
        
                        return undefined;
                    }
                );
            }
        );

        const drawBlueCard = new SelectOption("Spend 3 MC to draw a blue card", "Draw card", () => {
            player.megaCredits -= 3;
            player.cardsInHand.push(game.drawCardsByType(CardType.ACTIVE, 1)[0]);

            const drawnCard = game.getCardsInHandByType(player, CardType.ACTIVE).slice(-1)[0];
            this.logCardDraw(game, player, drawnCard);

            return undefined;
        });

        if (activeCards.length === 0) return drawBlueCard;
        if (!player.canAfford(3)) return flipBlueCard;

        return new OrOptions(drawBlueCard, flipBlueCard);
    }

    private convertCardPointsToTR(player: Player, game: Game, card: ICard) {
        if (card.getVictoryPoints !== undefined) {
            const steps = card.getVictoryPoints(player, game);
            player.increaseTerraformRatingSteps(steps, game);
            LogHelper.logTRIncrease(game, player, steps);
        }
    }

    private discardPlayedCard(player: Player, game: Game, card: ICard) {
        const cardIndex = player.playedCards.findIndex((c) => c.name === card.name);
        player.playedCards.splice(cardIndex, 1);
        game.dealer.discard(card as IProjectCard);
    }

    private logCardDraw(game: Game, player: Player, drawnCard: IProjectCard) {
        game.log(
            LogMessageType.DEFAULT,
            "${0} drew ${1}",
            new LogMessageData(LogMessageDataType.PLAYER, player.color),
            new LogMessageData(LogMessageDataType.CARD, drawnCard.name)
        );
    }
}
