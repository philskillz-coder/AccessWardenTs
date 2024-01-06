import { Button, HStack, Text, VStack } from "@hope-ui/solid";
import { useNavigate } from "@solidjs/router";

export function MfaSuggested() {
    const navigate = useNavigate();

    return (
        <HStack
            bg="$loContrast"
            rounded="$md"
            border="1px solid $neutral7"
            shadow="$lg"
            p="$4"
            w="$full"
        >
            <VStack alignItems="flex-start">
                <Text size="sm" fontWeight="$medium">
                    Info
                </Text>
                <Text size="sm" color="$neutral11">
                    Please enable 2FA to access all roles.
                </Text>
            </VStack>
            <Button
                variant="ghost"
                colorScheme="accent"
                size="sm"
                ml="auto"
                onClick={() => navigate("/account")}
            >
            Reply
            </Button>
        </HStack>
    );
}
