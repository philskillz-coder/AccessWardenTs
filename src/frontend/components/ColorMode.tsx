import { Button, useColorMode } from "@hope-ui/solid";

export function ColorModeSwitcher() {
    const { colorMode, toggleColorMode } = useColorMode();

    return (
        <Button onClick={toggleColorMode}>
            Toggle {colorMode() === "light" ? "dark" : "light"}
        </Button>
    );
}
