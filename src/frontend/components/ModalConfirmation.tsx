import { Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from "@hope-ui/solid";

interface ModalConfirmationProps {
    isOpen: () => boolean;
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
    children?: any | null;
}

export function ModalConfirmation(props: ModalConfirmationProps) {
    const { isOpen, onCancel, onConfirm, title } = props;

    return (
        <>
            <Modal centered opened={isOpen()} onClose={onCancel} initialFocus="#cancel-confirmation">
                <ModalOverlay />
                <ModalContent>
                    <ModalCloseButton />
                    <ModalHeader>{title}</ModalHeader>
                    <ModalBody>
                        {props.children}
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={onConfirm} colorScheme={"accent"}>Confirm</Button>
                        <Button id="cancel-confirmation" onClick={onCancel} ms="auto" colorScheme={"primary"}>Cancel</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}
