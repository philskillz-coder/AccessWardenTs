import { useColorMode } from "@hope-ui/solid";
import { A } from "@solidjs/router";
import { User } from "backend/database/entity/User";

function Landing(props) {
    const user: () => User = props.user;

    // eslint-disable-next-line no-unused-vars
    const { colorMode, toggleColorMode } = useColorMode();


    return (
        <>
            <div class="modal center ">
                <h1>Go to Dashboard</h1>
                <span>{user()?.username}</span>
                <div class="actions">
                    <div class="action bg-info">
                        <A href="/dashboard">Dashboard</A>
                    </div>
                    <div class="action border-center bg-info no-dyn-txt">
                        <A href="/login">Login</A>
                        <A href="/register">Register</A>
                    </div>
                    <div class="action border">
                        <button onClick={toggleColorMode}>
                            Toggle Visual Mode
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Landing;
