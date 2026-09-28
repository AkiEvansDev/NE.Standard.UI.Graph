using DemoApp.Graph;
using DemoApp.Graph.Planner;
using DemoApp.Graph.Web;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

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

// The planner's tables exist before the first request is answered; the catalogue starts empty.
app.Services.GetRequiredService<PlannerDatabase>().EnsureCreated();

await app.MapStandardUIWebAsync().ConfigureAwait(false);

await app.RunAsync().ConfigureAwait(false);
