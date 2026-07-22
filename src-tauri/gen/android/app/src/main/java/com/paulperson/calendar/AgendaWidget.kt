package com.paulperson.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Home-screen "today agenda" widget. Renders the JSON file the web app keeps
 * fresh in the app's files dir (see src/lib/widgetAgenda.ts) — the widget has
 * no network or JS runtime of its own. Refreshes every 30 min via
 * updatePeriodMillis, on launcher rebind, and manually via the ⟳ button.
 */
class AgendaWidget : AppWidgetProvider() {
    companion object {
        const val ACTION_REFRESH = "com.paulperson.calendar.WIDGET_REFRESH"
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(
                ComponentName(context, AgendaWidget::class.java)
            )
            // Re-read the agenda file and redraw.
            onUpdate(context, manager, ids)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_agenda)

            val serviceIntent = Intent(context, AgendaWidgetService::class.java)
            views.setRemoteAdapter(R.id.agenda_list, serviceIntent)
            views.setEmptyView(R.id.agenda_list, R.id.agenda_empty)

            val openApp = PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.agenda_root, openApp)
            views.setPendingIntentTemplate(R.id.agenda_list, openApp)

            val refresh = PendingIntent.getBroadcast(
                context,
                1,
                Intent(context, AgendaWidget::class.java).setAction(ACTION_REFRESH),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.agenda_refresh, refresh)

            appWidgetManager.updateAppWidget(id, views)
            appWidgetManager.notifyAppWidgetViewDataChanged(id, R.id.agenda_list)
        }
    }
}
