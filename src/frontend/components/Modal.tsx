const Modal = props => {
    return (
        <div class="ui-modal">
            <div class="actions">
                {props.children}
            </div>
        </div>
    );
};

const Action = props => {
    return (
        <div class="action">
            {props.children}
        </div>
    );
};

export { Action };
export default Modal;
