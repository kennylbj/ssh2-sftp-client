'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiSubset = require('chai-subset');
const chaiAsPromised = require('chai-as-promised');
const {join} = require('path');
const fs = require('fs');
const zlib = require('zlib');
const {
  config,
  getConnection,
  closeConnection
} = require('./hooks/global-hooks');
const {getSetup, getCleanup} = require('./hooks/get-hooks');

chai.use(chaiSubset);
chai.use(chaiAsPromised);

describe('get() method tests', function() {
  let hookSftp, sftp;

  before(function(done) {
    setTimeout(function() {
      done();
    }, config.delay);
  });

  before('get setup hook', async function() {
    hookSftp = await getConnection('get-hook');
    sftp = await getConnection('get');
    await getSetup(hookSftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('get cleanup hook', async function() {
    await getCleanup(hookSftp, config.sftpUrl, config.localUrl);
    await closeConnection('get', sftp);
    await closeConnection('get-hook', hookSftp);
    return true;
  });

  it('get returns a promise', function() {
    return expect(sftp.get(join(config.sftpUrl, 'get-promise.txt'))).to.be.a(
      'promise'
    );
  });

  it('get the file content', function() {
    return sftp.get(join(config.sftpUrl, 'get-promise.txt')).then(data => {
      let body = data.toString();
      return expect(body).to.equal('Get promise test');
    });
  });

  it('get large text file using a stream', function() {
    return sftp
      .get(
        join(config.sftpUrl, 'get-large.txt'),
        join(config.localUrl, 'get-large.txt'),
        {encoding: 'utf8'}
      )
      .then(() => {
        let stats = fs.statSync(join(config.localUrl, 'get-large.txt'));
        return expect(stats.size).to.equal(6973257);
      });
  });

  it('get gzipped file using a stream', function() {
    return sftp
      .get(
        join(config.sftpUrl, 'get-gzip.txt.gz'),
        join(config.localUrl, 'get-gzip.txt.gz')
      )
      .then(() => {
        let stats = fs.statSync(join(config.localUrl, 'get-gzip.txt.gz'));
        return expect(stats.size).to.equal(570314);
      });
  });

  it('get gzipped file and gunzip in pipe', function() {
    let localFile = join(config.localUrl, 'get-unzip.txt');
    let gunzip = zlib.createGunzip();
    let out = fs.createWriteStream(localFile, {
      flags: 'w',
      encoding: null
    });
    gunzip.pipe(out);
    return sftp
      .get(join(config.sftpUrl, 'get-gzip.txt.gz'), gunzip)
      .then(wtr => {
        wtr.flush();
        let stats = fs.statSync(localFile);
        return expect(stats.size).to.equal(6973257);
      });
  });

  it('get non-existent file is rejected', function() {
    return expect(
      sftp.get(join(config.sftpUrl, 'file-not-exist.md'))
    ).to.be.rejectedWith('No such file');
  });

  it('get with relative remote path 1', function() {
    return sftp
      .get(
        './testServer/get-gzip.txt.gz',
        join(config.localUrl, 'get-relative1-gzip.txt.gz')
      )
      .then(() => {
        let stats = fs.statSync(
          join(config.localUrl, 'get-relative1-gzip.txt.gz')
        );
        return expect(stats.size).to.equal(570314);
      });
  });

  it('get with relative remote path 2', function() {
    return sftp
      .get(
        '../tim/testServer/get-gzip.txt.gz',
        join(config.localUrl, 'get-relative2-gzip.txt.gz')
      )
      .then(() => {
        let stats = fs.statSync(
          join(config.localUrl, 'get-relative2-gzip.txt.gz')
        );
        return expect(stats.size).to.equal(570314);
      });
  });

  it('get with relative local path 3', function() {
    return sftp
      .get(
        join(config.sftpUrl, 'get-gzip.txt.gz'),
        './test/testData/get-relative3-gzip.txt.gz'
      )
      .then(() => {
        let stats = fs.statSync('./test/testData/get-relative3-gzip.txt.gz');
        return expect(stats.size).to.equal(570314);
      });
  });

  it('get with relative local path 4', function() {
    return sftp
      .get(
        join(config.sftpUrl, 'get-gzip.txt.gz'),
        '../ssh2-sftp-client/test/testData/get-relative4-gzip.txt.gz'
      )
      .then(() => {
        let stats = fs.statSync(
          join(config.localUrl, 'get-relative4-gzip.txt.gz')
        );
        return expect(stats.size).to.equal(570314);
      });
  });
});
