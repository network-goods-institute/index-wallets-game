import IndexCurrency from "@/assets/img/index-wallet-currency-symbol.svg?react";
import {
  currentPlayerAtom,
  dealerAtom,
  emitEventAtom,
  gameAtom,
  gameIdAtom,
  otherPlayersAtom,
  playerPortfolioValueAtom,
  purchaseRelativePriceIndexesAtom,
  selectedPayeeAtom,
  vendorPriceAtom,
} from "@/components/Game.state";
import { PlayerToken } from "@/components/PlayerToken";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { bn } from "@/lib/bnMath";
import { cn } from "@/lib/cn";
import { formatValue } from "@/lib/game/formatValue";
import { compositePrice } from "@/lib/indexWallets/compositePrice";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ReceiptIcon, Undo2Icon } from "lucide-react";
import { useCallback, useMemo } from "react";

export const PayTab = () => {
  const otherPlayers = useAtomValue(otherPlayersAtom);
  const purchaseRelativePriceIndexes = useAtomValue(
    purchaseRelativePriceIndexesAtom,
  );

  const [selectedPayee, setSelectedPayee] = useAtom(selectedPayeeAtom);

  const currentPlayer = useAtomValue(currentPlayerAtom);
  const dealer = useAtomValue(dealerAtom);
  const gameId = useAtomValue(gameIdAtom);

  const portfolioValue = useAtomValue(playerPortfolioValueAtom);

  const [vendorPriceInput, setVendorPriceInput] = useAtom(
    vendorPriceAtom(gameId, selectedPayee?.deviceId),
  );
  const vendorPrice = useMemo(() => {
    try {
      return bn(vendorPriceInput);
    } catch {
      return undefined;
    }
  }, [vendorPriceInput]);

  const buyerPrice = useMemo(() => {
    if (!selectedPayee || !vendorPrice) return undefined;

    return vendorPrice.mul(
      purchaseRelativePriceIndexes[selectedPayee.deviceId],
    );
  }, [selectedPayee, vendorPrice, purchaseRelativePriceIndexes]);

  const hasEnoughFunds = useMemo(() => {
    if (!buyerPrice) return undefined;
    return buyerPrice.lte(portfolioValue);
  }, [buyerPrice, portfolioValue]);

  const balanceAfterPurchase = useMemo(() => {
    if (!buyerPrice) return undefined;
    return portfolioValue.sub(buyerPrice);
  }, [buyerPrice, portfolioValue]);

  const updateGame = useSetAtom(gameAtom);
  const emitEvent = useSetAtom(emitEventAtom);

  const makePayment = useCallback(async () => {
    if (!selectedPayee || !vendorPrice || !buyerPrice || !hasEnoughFunds)
      return;

    const price = compositePrice({
      vendorPrice,
      buyerBalances: currentPlayer.balances,
      vendorValuations: selectedPayee.valuations,
    });

    updateGame((game) => {
      game.players.find(
        (player) => player.deviceId === currentPlayer.deviceId,
      )!.balances = currentPlayer.balances.map((balance, i) =>
        balance.sub(price[i]),
      );
      game.players.find(
        (player) => player.deviceId === selectedPayee.deviceId,
      )!.balances = selectedPayee.balances.map((balance, i) =>
        balance.add(price[i]),
      );
    }).then(() => {
      emitEvent({
        type: "PAYMENT_MADE",
        from: currentPlayer.deviceId,
        to: selectedPayee.deviceId,
        payment: price,
      });
    });

    setSelectedPayee(undefined);
  }, [
    vendorPrice,
    selectedPayee,
    buyerPrice,
    hasEnoughFunds,
    currentPlayer,
    updateGame,
    emitEvent,
    setSelectedPayee,
  ]);

  return (
    <TabsContent value="pay" className="justify-between xs:pt-10 overflow-clip">
      {!selectedPayee && (
        <>
          <div className="flex flex-col gap-2">
            {(currentPlayer.isDealer
              ? otherPlayers
              : [dealer, ...otherPlayers]
            ).map((player) => (
              <div
                onClick={() => setSelectedPayee(player)}
                key={player.deviceId}
                className="flex items-center border-2 cursor-pointer p-2 gap-2 shadow-sm rounded-lg hover:border-primary"
              >
                <PlayerToken className="size-16" />
                <div className="flex flex-col gap-0">
                  <p className="font-bold text-lg">{player.name}</p>
                  <p className="font-bold text-sm text-muted-foreground">
                    <ReceiptIcon className="inline size-4 align-text-top" /> x
                    {purchaseRelativePriceIndexes[player.deviceId].toFixed(1)}{" "}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {selectedPayee && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-0.5"
            onClick={() => setSelectedPayee(undefined)}
          >
            <Undo2Icon />
          </Button>

          <motion.div
            layout
            className="flex flex-col items-center gap-1 self-center"
          >
            <p className="font-bold text-lg">{selectedPayee.name}</p>
            <PlayerToken className="size-24 xs:size-28" />
          </motion.div>

          <motion.div
            layout
            className="flex flex-col items-center justify-center"
          >
            <Label
              htmlFor="vendor-price"
              className="text-center text-muted-foreground"
            >
              Their price
            </Label>
            <div className="relative inline-block">
              <IndexCurrency className="absolute left-3 top-5 h-4" />
              <Input
                maxLength={6}
                max={100}
                value={vendorPriceInput}
                onChange={(event) => setVendorPriceInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") makePayment();
                }}
                step={0.01}
                pattern="^\d+(\.\d{1,2})?$"
                id="vendor-price"
                inputMode="decimal"
                className="place-self-center w-32 h-12 mt-1 text-center  text-lg"
              />
            </div>
          </motion.div>

          <AnimatePresence mode="popLayout">
            {balanceAfterPurchase && (
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-3"
              >
                <div className="flex items-center flex-col text-muted-foreground/60">
                  <Label className="">You have</Label>
                  <p className="mt-2 text-lg font-bold ">
                    {formatValue(portfolioValue, {
                      withIndexSign: true,
                    })}
                  </p>
                </div>
                <div className="flex items-center flex-col">
                  <Label className="flex flex-col items-center mt-2 text-md text-muted-foreground">
                    <p className="font-bold">You pay</p>
                    <p className=" text-xs text-muted-foreground/60">
                      <ReceiptIcon className="inline size-3.5 align-text-top" />{" "}
                      x
                      {purchaseRelativePriceIndexes[
                        selectedPayee.deviceId
                      ].toFixed(1)}{" "}
                    </p>
                  </Label>
                  <p className="text-xl font-bold text-muted-foreground">
                    {!buyerPrice
                      ? "---"
                      : formatValue(buyerPrice, { withIndexSign: true })}
                  </p>
                </div>
                <div className="flex items-center flex-col text-muted-foreground/60">
                  <Label className=" ">You'll have</Label>
                  <p
                    className={cn(
                      "mt-2 text-lg font-bold",
                      balanceAfterPurchase.isNegative() && "text-destructive",
                    )}
                  >
                    {formatValue(balanceAfterPurchase, {
                      withIndexSign: true,
                    })}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="grid">
            {hasEnoughFunds === false && (
              <motion.p
                key="not-enough-funds"
                className="overlap text-destructive w-full leading-[3.5rem] align-middle text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Not enough funds
              </motion.p>
            )}

            <AnimatePresence mode="popLayout">
              {hasEnoughFunds && (
                <Button
                  key="pay-button"
                  asChild
                  onClick={makePayment}
                  className="relative overlap font-bold w-full text-lg h-14"
                >
                  <motion.div
                    className="relative"
                    initial={{ translateY: 200 }}
                    animate={{ translateY: 0 }}
                    exit={{ translateY: 200, zIndex: -10 }}
                  >
                    Pay
                  </motion.div>
                </Button>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </TabsContent>
  );
};
