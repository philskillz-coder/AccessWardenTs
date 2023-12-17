/* eslint-disable no-unused-vars */

import { OAuthUserTypings } from "@models/OAuthUsers";
import { CleanParticipant } from "@typings";
import Store from "frontend/Store";

const FinishedRoundCom = props => {
    const user: () => OAuthUserTypings = props.user;
    const store: () => Store = props.store;

    function generateAvatarUrl(user: CleanParticipant) {
        if (!user.avatarHash) {
            return `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`;
        } else {
            return `https://cdn.discordapp.com/avatars/${user.userID}/${user.avatarHash}.${user.avatarHash.startsWith("a_") ? "gif" : "webp"}`;
        }
    }

    return (
        <>
            <div class="ui-modal">
                <h1>Round has finished.</h1>
            </div>
        </>
    );
};
export default FinishedRoundCom;
