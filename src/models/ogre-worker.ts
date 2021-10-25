self.onmessage = (data: any) => {
    console.log('Worker: ', data);
    self.postMessage({
        answer: 42,
    });
};