using DemoApp.Graph;
using DemoApp.Graph.Web;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Logging;
using NE.Standard.UI.Web.Hosting;
using NE.Standard.UI.Web.Startup;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

#if DEBUG
builder.Logging.SetMinimumLevel(LogLevel.Debug);
#else
builder.Logging.SetMinimumLevel(LogLevel.Warning);
#endif

WebStartupBuilder.Configure<GraphWebStartup, GraphAppStartup>(builder.Services);

WebApplication app = builder.Build();

await app.MapStandardUIWebAsync().ConfigureAwait(false);

await app.RunAsync().ConfigureAwait(false);
