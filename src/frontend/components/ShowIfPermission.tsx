import { Show } from "solid-js";

export interface ShowIfPermissionProps {
    hasPermission: () => boolean | null;
    children?: any | null;
}

export function ShowIfPermission(props: ShowIfPermissionProps) {
    return (
        <>
            <Show when={props.hasPermission() === true}>
                {props.children}
            </Show>
            <Show when={props.hasPermission() === false}>
                <div class="ui-modal">
                    <h1>Access Denied</h1>
                    <span>You do not have permission to view this page.</span>
                </div>
            </Show>
        </>
    );
}
