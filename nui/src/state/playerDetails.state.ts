import {
  atom,
  selector,
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";
import { fetchWebPipe, PipeTimeout } from "../utils/fetchWebPipe";
import { debugLog } from "../utils/debugLog";
import { MockedPlayerDetails } from "../utils/constants";
import { PlayerData } from "../hooks/usePlayerListListener";
import { PlayerModalResp, PlayerModalSuccess } from "@shared/playerApiTypes";
import { GenericApiErrorResp } from "@shared/genericApiTypes";

const getPlayerDetailsFetchError = (error: unknown) => {
  const errorName = error instanceof Error
    ? error.name
    : typeof error === "object" && error && "name" in error
      ? String(error.name)
      : "";
  const errorMessage = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";

  if (
    errorName === "AbortError" ||
    errorMessage === "The user aborted a request."
  ) {
    return "Timed out fetching player data. Please try again.";
  }

  if (errorMessage) {
    return errorMessage;
  }

  return "Unknown error :(";
};

const playerDetails = {
  selectedPlayerData: selector<PlayerModalResp | undefined>({
    key: "selectedPlayerDetails",
    get: async ({ get }) => {
      get(playerDetails.forcePlayerRefresh);
      const assocPlayer = get(playerDetails.associatedPlayer);
      if (!assocPlayer) return;
      const assocPlayerId = assocPlayer.id;

      let res: any;
      try {
        res = await fetchWebPipe<PlayerModalResp>(
          `/player?mutex=current&netid=${assocPlayerId}`,
          { mockData: MockedPlayerDetails, timeout: PipeTimeout.LONG }
        );
      } catch (error) {
        debugLog("FetchWebPipeError", error, "PlayerFetch");
        return { error: getPlayerDetailsFetchError(error) };
      }
      debugLog("FetchWebPipe", res, "PlayerFetch");

      if (res.error) {
        return { error: (res as GenericApiErrorResp).error };
      } else if (res.player) {
        const player = (res as PlayerModalSuccess).player;
        if (player.isConnected) {
          return res;
        } else {
          return { error: 'This player is no longer connected to the server.' };
        }
      }else{
        return { error: 'Unknown error :(' };
      }
    },
  }),
  forcePlayerRefresh: atom({
    key: "forcePlayerRefresh",
    default: 0,
  }),
  associatedPlayer: atom<PlayerData | null>({
    key: "associatedPlayerDetails",
    default: null,
  }),
};

export const usePlayerDetailsValue = () =>
  useRecoilValue<PlayerModalResp>(playerDetails.selectedPlayerData);

export const useForcePlayerRefresh = () =>
  useSetRecoilState(playerDetails.forcePlayerRefresh);

export const useAssociatedPlayerValue = () =>
  useRecoilValue<PlayerData>(playerDetails.associatedPlayer);

export const useSetAssociatedPlayer = () =>
  useSetRecoilState<PlayerData>(playerDetails.associatedPlayer);
