import { createSignal } from "solid-js";

function PChildFunc(initial: number = 0) {
    const [activeChild, setActiveChild] = createSignal(initial);

    function isShow(child: number) {
        return child === activeChild();
    }

    return [ setActiveChild, isShow ];
}
