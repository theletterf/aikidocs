const { expect } = require('chai');
const { cleanupContext } = require('../src/compress.js');

describe('cleanupContext', () => {
  describe('function type', () => {
    it('should be a function', () => {
      expect(cleanupContext).to.be.instanceOf(Function);
    });
  });

  describe('trim spaces', () => {
    it('should trim all whitespace from start and end of input', function () {
      expect(cleanupContext('  \thello\nworld \n   ')).to.equal('hello\nworld');
    });
  });

  describe('collapse newlines', () => {
    it('should collapse 3 or more connsecutive newlines down to 2', function () {
      expect(cleanupContext('hello\n\n\n\nthere\nworld')).to.equal(
        'hello\n\nthere\nworld',
      );
    });
  });

  describe('preserve codeblocks', () => {
    it('should preserve whitespace in a codeblock', function () {
      const result = cleanupContext('hello    \n```\n    world;\n```');
      expect(result).to.equal('hello\n```\n    world;\n```');
    });

    it('should preserve whitespace in multiple codeblocks', function () {
      const result = cleanupContext(
        '```js\n  hello\n  world\n```\nand\n```sh\n    world;\n```',
      );
      expect(result).to.equal(
        '```js\n  hello\n  world\n```\nand\n```sh\n    world;\n```',
      );
    });
  });
});
