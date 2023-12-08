const action = (options) => {
    console.log('Hello World!', options);
};

const command = {
    name: 'run',
    description: '(Default) Run',
    action,
};

export default command;
