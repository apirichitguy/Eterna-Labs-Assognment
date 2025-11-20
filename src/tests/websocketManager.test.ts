import { WebsocketManager } from '../services/WebsocketManager';

test('WebsocketManager attach and emit', () => {
  const m = new WebsocketManager();
  const fakeSocket = {
    send: jest.fn(),
    on: jest.fn()
  };
  m.attach(fakeSocket as any, 'o1');
  m.emit('o1', { status: 'pending' });
  expect((fakeSocket.send as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
});
