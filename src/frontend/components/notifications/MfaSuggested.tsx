import { Avatar, Button, HStack, Text, VStack } from "@hope-ui/solid";
import { NotificationConfigRenderProps } from "@hope-ui/solid/dist/components/notification/notification.types";
import { useNavigate } from "@solidjs/router";

export function MfaSuggested(props: NotificationConfigRenderProps) {
    const navigate = useNavigate();

    function clickNavigate() {
        props.close();
        navigate("/account");
    }

    return (
        <HStack
            bg="$loContrast"
            rounded="$md"
            border="1px solid $neutral7"
            shadow="$lg"
            p="$4"
            w="$full"
        >
            <Avatar mr="$3" />
            <VStack alignItems="flex-start">
                <Text size="sm" fontWeight="$medium">
                    Account Info
                </Text>
                <Text size="sm" color="$neutral11">
                    Enable 2FA to access all Roles.
                </Text>
            </VStack>
            <Button
                variant="ghost"
                colorScheme="accent"
                size="sm"
                ml="auto"
                onClick={clickNavigate}
            >
                Enable
            </Button>
        </HStack>
    );
}
