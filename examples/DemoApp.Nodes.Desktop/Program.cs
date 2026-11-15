using System;

namespace DemoApp.Nodes.Desktop;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
        => DesktopStartupBuilder.Run<NodesDesktopStartup, NodesAppStartup>(args);
}
