import re

with open('src/pages/VideoAdvertCreator.jsx', 'r') as f:
    text = f.read()

header_start = text.find('<header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">')
header_end = text.find('</header>') + len('</header>')

new_header = """<header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#2C666E] to-[#07393C] rounded-xl shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Stitch Studio</h1>
                <p className="text-xs text-slate-400">Non-Linear Editor</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 hidden md:flex">
                <Link to="/campaigns">View Campaigns</Link>
              </Button>
              <div className="h-4 w-px bg-slate-700 hidden md:block mx-1"></div>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger className="w-32 h-8 bg-slate-800 border-slate-700 text-slate-100 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-xs">
                  {platformList.map(platform => (
                    <SelectItem key={platform.value} value={platform.value} className="text-slate-100 focus:bg-slate-700">
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="h-4 w-px bg-slate-700 hidden md:block mx-1"></div>
              <Button size="sm" className="h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                Save to Campaign
              </Button>
              <Button size="sm" className="h-8 bg-[#2C666E] hover:bg-[#07393C] text-white">
                Publish
              </Button>
              <div className="h-4 w-px bg-slate-700 hidden md:block mx-1"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(true)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> API Keys
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-slate-400 hover:text-red-400 hover:bg-slate-800 gap-1.5"
                title={user?.email}
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>"""

text = text[:header_start] + new_header + text[header_end:]

with open('src/pages/VideoAdvertCreator.jsx', 'w') as f:
    f.write(text)
