module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        webpackConfig.ignoreWarnings = [
          {
            module: /html2pdf\.js/,
            message: /Failed to parse source map/,
          },
        ];
        return webpackConfig;
      },
    },
  };
  