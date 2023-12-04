const action = (options) => {
    console.log('Hello World!');
};

const command = {
    name: 'run',
    description: '(Default) Run',
    action,
};

export default command;
