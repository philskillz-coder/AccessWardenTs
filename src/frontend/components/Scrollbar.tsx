import { For } from "solid-js";

interface ScrollDivProps {
    children?: any;
    orientation: "vertical" | "horizontal" | "responsive";
    pinned_data: () => any;
    scroll_data: () => any;
    // eslint-disable-next-line no-unused-vars
    child_wrapper: (item) => any;
}

export function ScrollDiv(props: ScrollDivProps) {
    const orientation = props.orientation || "vertical";
    const pinned_data = props.pinned_data || (() => []);
    const scroll_data = props.scroll_data || (() => []);

    return (
        <>
            <div class={`ui-scroller or-${orientation}`}>
                <div class="pinned">
                    <For each={pinned_data()}>
                        {item => props.child_wrapper(item)}
                    </For>
                </div>
                <div class="scroll">
                    <For each={scroll_data()}>
                        {item => props.child_wrapper(item)}
                    </For>
                </div>
            </div>
        </>
    );
}
